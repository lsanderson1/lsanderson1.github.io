;; blender-ipc.lisp
;; ----------------
;; This provides a helper for sending JSON commands from LISP to Blender
;; Over a TCP socket. It recursively converts nested plists to alists
;; encodes them as JSON objects, then sends them to a running Blender server

(defparameter *blender-host* "127.0.0.1")
"Host or IP Address where the Blender socket server is listening"

(defparameter *blender-port* 5000)
"TCP port number that the Blender socket server is bound to"

(defun plist-to-alist-recursive (plist)
  "Convert PLIST (a property list, format that stores serialized objects similar to dict) into
   an equivalent alist (association list) suitable for JSON encoding.
   Each keyword key is converted to lowercase string for JSON object keys"
  (let ((alist '()))
    (loop for (key val) on plist by #'cddr
	  do
	     ;; Convert each KEY/VALUE pair
	     (push (cons
		    ;; JSON object key: lowercase string of the keyword
		    (string-downcase (string key))
		    ;; Recursively convert nested plist values, leave others as-is
		    (if (and (listp val)
			     (keywordp (first val)))
			(plist-to-alist-recursive val)
			val))
		   alist))
    ;; Return the alist in the original order
    (nreverse alist)))

(defun update-blender-scene (data-plist)
  "Convert DATA-PLIST (a property list) into a JSON object and send it over
   a TCP socket to the Blender socket server defined in the host and port parameters above.

   STEPS:
       1. Recursively convert the top-level and nested plists into an alist via
          PLIST-TO-ALIST recursive
       2. Encode that alist into a JSON string using CL-JSON's encode-json-to-string
       3. Open a socket connection to Blender
       4. Obtain the associated Lisp stream and write the JSON payload
       5. Flush the stream and close the socket"
  
  (let* ((nested-alist (plist-to-alist-recursive data-plist))
	 ;; JSON payload: convert nested alist to string
	 (json-str     (cl-json:encode-json-to-string nested-alist))
	 ;; Establish TCP connection to Blender
	 (sock         (usocket:socket-connect *blender-host* *blender-port*))
	 ;; Get the lisp stream associated with the socket
	 (stream       (usocket:socket-stream sock))
	 (responses    '()))
    ;; Write the JSON text to the socket stream
    (write-string json-str stream)
    ;; Ensures a newline in Blender so the message is complete
    (terpri stream)
    ;; ensures all data is sent immediately
    (finish-output stream)

    ;; Read back every line until EOF
    (loop for line = (read-line stream nil nil)
	  while line
	  do (push line responses))

    ;; Now dump everything all at once, with exactly one prefix
    (format t "~%[Blender]:~%~{~A~%~}"
	     (nreverse responses))
    
    ;; close the connection
    (usocket:socket-close sock)

    ;; Return the collected lines
    (nreverse responses)))
