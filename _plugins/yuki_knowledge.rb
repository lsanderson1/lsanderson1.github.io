# Index the final, publicly rendered page, including layout-provided instructions.
# No filesystem content, drafts, form values, scripts or navigation is indexed.
require 'json'
require 'cgi'

module YukiKnowledge
  TAG = /<(?:"[^"]*"|'[^']*'|[^'">])*>/m
  def self.text(html)
    value = html.gsub(/<!--.*?-->/m, '')
    value = value.gsub(/<(script|style|form|nav|iframe|video)\b[^>]*>.*?<\/\1\s*>/mi, '')
    value = value.gsub(/<\/(?:p|div|li|tr|section|h[1-6])\s*>|<br\s*\/?\s*>/i, "\n")
    value = value.gsub(/<\/(?:span|td|th)\s*>/i, ' ')
    CGI.unescapeHTML(value.gsub(TAG, '')).gsub(/[\t\r ]+/, ' ').gsub(/\n\s*\n+/, "\n").strip
  end

  def self.index(page, base)
    html = page.output
    match = /<main\b[^>]*>(.*?)<\/main\s*>/mi.match(html)
    return nil unless match
    sections = []
    # Stable ASCII references work for Japanese headings too. Existing anchors
    # stay intact; only headings without IDs receive a new navigation anchor.
    main = match[1].gsub(/<h([1-3])\b([^>]*)>(.*?)<\/h\1\s*>/mi) do
      level, attrs, label = Regexp.last_match.captures
      id = "s#{sections.length}"
      existing = /(?:\A|\s)id\s*=\s*["']([^"']+)["']/i.match(attrs)
      anchor = existing ? CGI.unescapeHTML(existing[1]) : "yuki-section-#{sections.length}"
      attrs += " id=\"#{anchor}\"" unless existing
      # Keep original Japanese permalinks and add an ASCII alias for the guide's
      # deliberately strict same-site URL allowlist. The span has no visual size.
      if existing && !anchor.match?(/\A[A-Za-z0-9_\-:.]+\z/)
        anchor = "yuki-section-#{sections.length}"
        label = "<span id=\"#{anchor}\" data-yuki-anchor aria-hidden=\"true\"></span>" + label
      end
      sections << {'id'=>id, 'title'=>text(label), 'anchor'=>anchor, 'text'=>''}
      "<h#{level}#{attrs} data-yuki-section=\"#{id}\">#{label}</h#{level}>"
    end
    positions = []
    main.to_enum(:scan, /<h[1-3]\b[^>]*data-yuki-section="s\d+"[^>]*>/i).each { positions << Regexp.last_match.begin(0) }
    sections.each_with_index do |section, i|
      section['text'] = text(main[positions[i]...(positions[i+1] || main.length)])
    end
    images = []
    main = main.gsub(/<img\b((?:"[^"]*"|'[^']*'|[^'">])*)>/mi) do |tag|
      attrs = Regexp.last_match[1]
      alt = /(?:\A|\s)alt\s*=\s*["']([^"']+)["']/i.match(attrs)
      next tag unless alt && !alt[1].strip.empty?
      description = CGI.unescapeHTML(alt[1])
      id = "i#{images.length}"
      existing = /(?:\A|\s)id\s*=\s*["']([^"']+)["']/i.match(attrs)
      anchor = existing ? CGI.unescapeHTML(existing[1]) : "yuki-image-#{images.length}"
      attrs = attrs.sub(/\/\s*\z/, '')
      attrs += " id=\"#{anchor}\"" unless existing
      images << {'id'=>id, 'title'=>description[0,160], 'anchor'=>anchor, 'kind'=>'image',
                 'text'=>"Published image description (not visual analysis): #{description}"}
      "<img#{attrs} data-yuki-section=\"#{id}\">"
    end
    # Only genuine figure captions count as descriptions of the enclosed image.
    main.scan(/<figure\b[^>]*>(.*?)<\/figure>/mi).each do |figure|
      caption = /<figcaption\b[^>]*>(.*?)<\/figcaption>/mi.match(figure[0])
      next unless caption
      figure[0].scan(/data-yuki-section="(i\d+)"/).each do |image_id|
        item = images.find { |image| image['id'] == image_id[0] }
        item['text'] += "\nPublished caption: #{text(caption[1])}" if item
      end
    end
    sections.concat(images)
    # Only add nonvisual identifiers, preserving the page's artwork and layout.
    page.output = html[0...match.begin(1)] + main + html[match.end(1)..-1]
    lang = page.data['lang'] == 'ja' ? 'ja' : 'en'
    url = base + page.url
    {'id'=>page.url.sub(%r{\A/ja(?=/)}, ''), 'lang'=>lang, 'url'=>url,
     'title'=>page.data['title'] || sections.first&.dig('title') || 'Portfolio',
     'summary'=>page.data['summary'] || page.data['description'] || '',
     'text'=>text(main), 'sections'=>sections}
  end
end

Jekyll::Hooks.register :site, :post_render do |site|
  index_page = site.pages.find { |p| p.url == '/assets/yuki/knowledge.json' }
  next unless index_page
  base = site.baseurl.to_s
  pages = site.pages.select do |p|
    data = p.data
    public_entry = %w[project essay].include?(data['type']) && data['published'] == true
    public_entry ||= data['type'] == 'unreal-journey'
    public_entry ||= %w[/ /ja/ /resume.html /ja/resume.html /projects/ /ja/projects/ /essays/ /ja/essays/ /unreal-journey/ /ja/unreal-journey/].include?(p.url)
    public_entry && data['draft'] != true && data['published'] != false
  end.sort_by(&:url).filter_map { |p| YukiKnowledge.index(p, base) }
  data = {'version'=>2, 'owner'=>site.data.dig('bio','basics','name'),
          'bio'=>{'en'=>site.data.dig('bio','basics','summary'), 'ja'=>site.data.dig('bio_ja','basics','summary')},
          'skills'=>site.data.dig('bio','skills'), 'pages'=>pages}
  json = JSON.generate(data)
  raise 'Yuki public knowledge index exceeds its 2 MB safety limit' if json.bytesize > 2_000_000
  index_page.output = json
end
