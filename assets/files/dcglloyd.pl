%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%% Filename: dcglloyd.pl
%% Date: 2025-04-11
%% Authors: Lloyd Sanderson   
%% Description:
%%     Provides DCG syntax to parse certain words and queries into
%%     tokens which are then read by the compiler and answered according to
%%     their respective clauses. 2 different question syntaxes are taken into
%%     account: Who and What. Depending on the tokens consumed in the query, it
%%     parses into certain question verbs and phrases, then pulls from a database,
%%     a list of facts that it then presents in the listener. Takes grammatical queries only
%%     and reject and decline ungrammatical queries. Additionally, it provides hints given
%%     the answer is shown as wrong when input by the user.
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% Declare some predicates as discontiguous so that their clauses may be defined in non�]adjacent parts of the file.
:- discontiguous plays/3.
:- discontiguous directs/2.
:- discontiguous title_of/2.
:- discontiguous proper_noun/3.
:- discontiguous question_verb/3.
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%			  HELPER FOR RELATIONS				%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%% Succeeds if Actor plays Character in Movie
actor_for(Character,Actor,Movie) :-
    plays(Actor,Character,Movie).

%% Succeeds if Actor plays Character (ignoring movie)
character_of(Actor,Character) :-
    plays(Actor,Character,_).

%% Succeeds if Director directs Movie
director_of(Movie,Director) :-
    directs(Director,Movie).

%% Succeeds if Actor plays in Movie
actor_in(Movie,Actor) :-
    plays(Actor,_,Movie).

%% Succeeds if Director exists in any context
is_director(Director) :-
    directs(Director, _).
    
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%                           TOP LEVEL                                      %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% The top/1 predicate is the main entry point that handles queries.
% It attempts to parse the input list (S) using various DCG rules (yesno/1, who/1, what/1).
% It then tests the semantic query, writes an appropriate response, or prints a hint if false.

% If the parsed yes/no query succeeds (test(Query) succeeds), output a positive message.
top(S) :-
    yesno(Query, S, []),  % Parse S as a yes/no query; Query is a list of semantic facts.
    test(Query),          % Evaluate each fact in Query using test/1.
    !,
    write('Yes, that is true.'), nl, !.

% If the parsed yes/no query fails (test(Query) fails), output a negative message and then produce hints.
top(S) :-
    yesno(Query, S, []),
    \+ test(Query),       % One or more facts in Query failed.
    !,
    write('Sorry, that is false.'), nl,
    hint(Query),          % Process the list of facts to generate hints.
    !.

% If the query is a Who-question, parse it with the who/1 rule and then answer.
top(S) :-
    who(Query, S, []),
    !,
    answer_who(Query).

% If the query is a What-question, parse it with the what/1 rule and then answer.
top(S) :-
    what(Query, S, []),
    !,
    answer_what(Query).

% Fallback clause if none of the above parsing rules match.
top(_) :-
    write('I dont get it.'), nl, !.

% test/1 predicate: succeeds if all elements of the list are true.
test([]).
test([H|T]) :- 
    H,           % Call the fact.
    test(T).     % Recursively test the remainder of the list.

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%                         ANSWER PREDICATES                                %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% answer_who/1 handles "Who" queries based on the semantic representation produced by the DCG.
% It has several clauses depending on the structure of the query.

% Clause for queries of the form actor_for(Character, Actor, Movie):
% Retrieves a fact from plays/3, formats the names, and prints the result.
answer_who(actor_for(Character, Actor, Movie)) :-
    plays(Actor, Character, Movie),
    formatname(Actor, ChangedActor),
    formatname(Character, ChangedCharacter),
    formatname(Movie, ChangedMovie),
    format('~w plays as ~w in ~w.', [ChangedActor, ChangedCharacter, ChangedMovie]), nl.

% Clause for queries of the form actor_for(Character, Actor) (movie unspecified):
answer_who(actor_for(Character, Actor)) :-
    plays(Actor, Character, Movie),
    formatname(Actor, ChangedActor),
    formatname(Character, ChangedCharacter),
    formatname(Movie, ChangedMovie),
    format('~w plays as ~w in ~w.', [ChangedActor, ChangedCharacter, ChangedMovie]), nl.

% Clause for queries directly produced as plays/3:
answer_who(plays(_, Character, Movie)) :-
    plays(Actor, Character, Movie),
    formatname(Actor, ChangedActor),
    formatname(Character, ChangedCharacter),
    formatname(Movie, ChangedMovie),
    format('~w plays as ~w in ~w.', [ChangedActor, ChangedCharacter, ChangedMovie]), nl.

% Clause for character_of queries (Who is the character of ...?):
answer_who(character_of(Actor, Character)) :-
    plays(Actor, Character, Movie),  % The fact is derived from plays/3.
    formatname(Actor, ChangedActor),
    formatname(Character, ChangedCharacter),
    formatname(Movie, ChangedMovie),
    format('~w is the character of ~w in ~w.', [ChangedActor, ChangedCharacter, ChangedMovie]), nl.

% Clause for director_of queries (Who is the director of ...?):
answer_who(director_of(Movie, Director)) :-
    director_of(Movie, Director),
    formatname(Movie, ChangedMovie),
    formatname(Director, ChangedDirector),
    % The call director_of(Movie,Director) is repeated for clarity (or additional side effects),
    director_of(Movie, Director),
    format('The director of ~w is ~w.', [ChangedMovie, ChangedDirector]), nl.

% Clause for actor_in queries (Who acts in ...?):
answer_who(actor_in(Movie, Actor)) :-
    actor_in(Movie, Actor),
    formatname(Actor, ChangedActor),
    formatname(Movie, ChangedMovie),
    format('~w acts in ~w.', [ChangedActor, ChangedMovie]), nl.

% answer_what/1 handles "What" queries (for example, "What is the title of ...?")
answer_what(title_of(Movie, Title)) :-
    title_of(Movie, Title),
    formatname(Movie, ChangedMovie),
    format('The title of ~w is "~w".', [ChangedMovie, Title]), nl.

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%                             DCG GRAMMAR                                  %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

%  This defines DCG rules and how to parse the input (a list of tokens) into semantic representations.

% yesno/1: Parses yes/no queries.
yesno(Sem) -->
    optional_intro, statements(Sem), optional_right, [?].
yesno(Sem) -->
    [did], statement_past(Sem), optional_right, [?].
yesno(Sem) -->
    statements(Sem), optional_right, [?].

% optional_intro: Parses an optional introductory phrase like "is it true that"
optional_intro -->
    [is, it, true, that].

% who/1: Parses queries starting with "who" followed by a question verb.
who(Sem) -->
    [who], question_verb(Sem), [?].

% what/1: Parses "what is the title of ..." queries.
what(title_of(Movie, _Title)) -->
    [what, is, the, title, of], proper_noun(Movie), [?].

% statement/1: Parses a statement into a list of semantic facts.
statement(Fact) -->
    noun_phrase(Subj, _), verb_phrase(Subj, _Type, Fact).

% Base case: takes on minimum one statement per call.
statements([Fact]) -->
    statement(Fact).

% Recurses through the entirety of the facts that are connected by separators to evaluate each
% of the queries that are described in the token input
statements([Fact|Rest]) -->
    statement(Fact),
    separator,
    statements(Rest).

% statement_past/1: Parses past-tense statements.
statement_past([Fact]) -->
    noun_phrase(Subj, _),
    verb_phrase_past(Subj, Fact).

% Unnecessary coding...
statement_past([Fact|Rest]) -->
    noun_phrase(Subj, _),
    verb_phrase_past(Subj, Fact),
    separator,
    statement_past(Rest).

% A separator/1 predicate that separates each fact called in multi-fact sentences.
% Able to parse either when input is shown as a comma or an and.
separator --> [','].
separator --> [and].
separator --> [','], [and].

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%                           HINT SECTION (E.C)?                            %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% The hint/1 predicate processes a list of semantic facts (the parsed query)
% and, for each fact that fails (via run_hint/1), calls hint_fact/1 to print a suggestion.
hint([]).
hint([Fact|Rest]) :-
    run_hint(Fact),
    hint(Rest).

% run_hint/1: If a fact succeeds (call(Fact) is true), do nothing.
run_hint(Fact) :-
    call(Fact).
    
% Otherwise, if the fact fails, call hint_fact/1 to print a hint.
run_hint(Fact) :-
    \+ call(Fact),
    hint_fact(Fact).

%% --------------------------- Director Queries -------------------------------
% These clauses provide hints when a director query is misclassified.

% If a query uses a director predicate but the given person is not a director
% (i.e. there is no fact director_of(_, GivenDirector)) and the person appears in plays/3 as a character,
% then they are misclassified.

% If the director is misclassified as an actor, print out the following...
% Because the below 2 hints are the same structure, the argument would need to be instantiated to
% correctly choose the right clause to use.
    
hint_fact(plays(Person, _, _)) :-
    \+ var(Person),  % Requires the Person to be instantiated
    directs(Person, _),
    formatname(Person, ChangedPerson),
    format('~w is a director, not an actor.', [ChangedPerson]), nl.
    
% If the director is misclassified as a character (AKA shown in the second argument)
hint_fact(plays(_, Person, _)) :-
    \+ var(Person), % Requires Person to be instantiated
    directs(Person, _),
    formatname(Person, ChangedPerson),
    format('~w is a director, not a character.', [ChangedPerson]), nl.
    
hint_fact(directs(GivenDirector, _Movie)) :-
    \+ (director_of(_, GivenDirector)),  % GivenDirector is not found as a director.
    plays(_, GivenDirector, _),          % But appears in plays/3 (as a character).
    formatname(GivenDirector, ChangedDirector),
    format('~w is a character, not a director.', [ChangedDirector]), nl.

% Similar clause for director_of queries.
hint_fact(director_of(_Movie, GivenDirector)) :-
    \+ (director_of(_, GivenDirector)),
    plays(_, GivenDirector, _),
    formatname(GivenDirector, ChangedDirector),
    format('~w is a character, not a director.', [ChangedDirector]), nl.

% If the movie is specified (nonvar(Movie)) in a directs/2 query,
% then look up the correct director and suggest the correct answer.
hint_fact(directs(GivenDirector, Movie)) :-
    \+ var(Movie),
    director_of(Movie, CorrectDirector),
    GivenDirector \= CorrectDirector,
    formatname(CorrectDirector, ChangedDirector),
    formatname(Movie, ChangedMovie),
    format('You might be looking for ~w who directed ~w.', [ChangedDirector, ChangedMovie]), nl.
 
% If no movie is specified (var(Movie)), and the given director appears in plays/3,
% then indicate the person is actually an actor.
hint_fact(directs(GivenDirector, Movie)) :-
    var(Movie),
    plays(GivenDirector, _, _),
    formatname(GivenDirector, ChangedDirector),
    format('~w is an actor, not a director.', [ChangedDirector]), nl.

% Similar hint for director_of/2 queries.
hint_fact(director_of(Movie, GivenDirector)) :-
    director_of(Movie, CorrectDirector),
    GivenDirector \= CorrectDirector,
    formatname(CorrectDirector, ChangedDirector),
    formatname(Movie, ChangedMovie),
    format('You might be looking for ~w who directed ~w.', [ChangedDirector, ChangedMovie]), nl.

%% ----------------------- Actor vs. Character Misclassification -----------------------
% If a query is parsed as an actor query (plays(Person,_,_)) but the given person
% never appears as an actor (first argument) and does appear as a character (second argument),
% then the person is really a character.
hint_fact(plays(Person, _, _)) :-
    \+ plays(Person, _, _),
    plays(_, Person, _),
    formatname(Person, ChangedPerson),
    format('~w is a character, not an actor or director.', [ChangedPerson]), nl.

% If a query is parsed as a character query (plays(_, Person, _)) but the given person
% does appear as an actor (first argument), then the person is actually an actor.
hint_fact(plays(_, Person, _)) :-
    plays(Person, _, _),
    formatname(Person, ChangedPerson),
    format('~w is an actor, not a character.', [ChangedPerson]), nl.

%% ---------------------------- Actor Query Hints -------------------------------------
% If the query is of the form actor_for(Character, GivenActor, Movie)
% and the CorrectActor (from actor_for/3) is different than the GivenActor,
% then suggest the correct actor
hint_fact(actor_for(Character, GivenActor, Movie)) :-
    actor_for(Character, CorrectActor, Movie),
    GivenActor \= CorrectActor,
    formatname(CorrectActor, ChangedActor),
    formatname(Character, ChangedCharacter),
    formatname(Movie, ChangedMovie),
    format('You might be looking for ~w who plays ~w in ~w.', [ChangedActor, ChangedCharacter, ChangedMovie]), nl.

%% Similarly for actor_for(Character, GivenActor) without specified movie
hint_fact(actor_for(Character, GivenActor)) :-
    actor_for(Character, CorrectActor, Movie),
    GivenActor \= CorrectActor,
    formatname(CorrectActor, ChangedActor),
    formatname(Character, ChangedCharacter),
    formatname(Movie, ChangedMovie),
    format('You might be looking for ~w who played ~w in ~w.', [ChangedActor, ChangedCharacter, ChangedMovie]), nl.

%% If the query produces a plays/3 semantic term for an actor query
% then use actor_for/3 to provide the correct answer
hint_fact(plays(_, Character, Movie)) :-
    actor_for(Character, CorrectActor, Movie),
    formatname(CorrectActor, ChangedActor),
    formatname(Character, ChangedCharacter),
    formatname(Movie, ChangedMovie),
    format('You might be looking for ~w who played ~w in ~w.', [ChangedActor, ChangedCharacter, ChangedMovie]), nl.

%% --------------------------- Movie Relation --------------------------------
%% If the given query specifies a movie for the character, but the fact is not found for that movie
% then look up the correct movie for that character
hint_fact(plays(_, Character, Movie)) :-
    \+ plays(_, Character, Movie),       % No fact for the character in the queried Movie
    plays(_, Character, CorrectMovie),   % There is a fact for character in the correct movie
    CorrectMovie \= Movie,               % And its different from the queried movie
    formatname(Character, ChangedCharacter),
    formatname(CorrectMovie, ChangedMovie),
    format('~w is a character in ~w.', [ChangedCharacter, ChangedMovie]), nl.
    

%% ---------------- Character Related hints -----------------
%% For queries of the form character_of(Actor,GivenActor)
% if the CorrectCharacter (from character_in/2) is different from the GivenCharacter
% then provide the correct character from the given fact
hint_fact(character_of(Actor, GivenCharacter)) :-
    character_of(Actor, CorrectCharacter),
    GivenCharacter \= CorrectCharacter,
    formatname(Actor, ChangedActor),
    formatname(CorrectCharacter, ChangedCharacter),
    format('You might be looking for ~w, who is the character of ~w.', [ChangedCharacter, ChangedActor]), nl.

%% ------------------ Actor_in Query Hint -------------------
% For queries of the form actor_in(Movie, GivenActor)
% If the CorrectActor (from actor_in/2) is different from the GivenActor
% Then suggest the correct one
hint_fact(actor_in(Movie, GivenActor)) :-
    actor_in(Movie, CorrectActor),
    GivenActor \= CorrectActor,
    formatname(CorrectActor, ChangedActor),
    formatname(Movie, ChangedMovie),
    format('You might be looking for ~w who acted in ~w.', [ChangedActor, ChangedMovie]), nl.

%% Fallback: If nothing matches do nothing
hint_fact(_) :-
    true.
%%----------------------------------------------------------------------------

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%		         PHRASE CONSTRUCTION			    %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% noun_phrase/2: Builds a noun_phrase for a given actor, character, or a director
noun_phrase(Name, actor) --> proper_noun(Name).
noun_phrase(Name, director) --> proper_noun(Name).
noun_phrase(Name, character) --> proper_noun(Name).

% verb_phrase/3: builds a verb_phrase connecting a subject (Subj) to a fact
% The second argument (Type) distinguishes whether it is a actor, character, or director
verb_phrase(Subj, actor, plays(Subj,_,_)) -->
    [is,an,actor].
verb_phrase(Subj, character, plays(_,Subj,_)) -->
    [is,a,character].
verb_phrase(Subj, character, plays(_,Subj,Movie)) -->
    [is,a,character,in], proper_noun(Movie).
verb_phrase(Subj, director, directs(Subj, _)) -->
    [is,a,director].
    
% For actor queries with "plays as" or "is the actor for" a given character
verb_phrase(_, actor, actor_for(Character,_Actor)) -->
    ( [plays,as] ; [is,the,actor,for] ), proper_noun(Character).
verb_phrase(_, actor, actor_for(Character,_Actor,Movie)) -->
    ( [plays,as] ; [is,the,actor,for] ), proper_noun(Character), [in], proper_noun(Movie).

% For generic plays/3 queries
verb_phrase(Subj, _, plays(Subj,Character,_)) -->
    [plays], proper_noun(Character).
verb_phrase(Subj, _, plays(Subj,Character,Movie)) -->
    [plays], proper_noun(Character), [in], proper_noun(Movie).

% For generic director queries
verb_phrase(Subj, _, directs(Subj,Obj)) -->
    [directs], proper_noun(Obj).

% For character_of queries
verb_phrase(_, character, character_of(Actor,_Character)) -->
    [is,the,character,of], proper_noun(Actor).

% director_of queries
verb_phrase(_, director, director_of(Movie,_Director)) -->
    [is,the,director,of], proper_noun(Movie).

% actor_in queries
verb_phrase(_, actor, actor_in(Movie,_Actor)) -->
    [acts,in], proper_noun(Movie).

% verb_phrase_past/2: Builds a past-tense verb_phrase (e.g. "play" instead of "plays")
verb_phrase_past(Subj, plays(Subj,Character,Movie)) -->
    [play], proper_noun(Character), [in], proper_noun(Movie).
verb_phrase_past(Subj, plays(Subj,Character,_)) -->
    [play], proper_noun(Character).
verb_phrase_past(Subj, directs(Subj,Obj)) -->
    [direct], proper_noun(Obj).

% For questions that use directs so that the resulting semantic term matches the answer_who phrase
question_verb(director_of(Movie, _)) -->
    [directs], proper_noun(Movie).
    
% Allows for the usage of a "right" at the end of a statement, takes with a comma, or just by itself
optional_right --> separator, [right].
optional_right --> [right].
optional_right --> [].

% question_verb/1: Parses a question verb phrase
question_verb(Sem) -->
    verb_phrase(_,_,Sem).


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%			 LEXICON (Proper Nouns)				%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%% proper_noun/1: Parses multi-word proper names into atoms.

proper_noun(mark_hamill) --> [mark,hamill].
proper_noun(harrison_ford) --> [harrison,ford].
proper_noun(carrie_fisher) --> [carrie,fisher].
proper_noun(liam_neeson) --> [liam,neeson].
proper_noun(natalie_portman) --> [natalie,portman].
proper_noun(jake_lloyd) --> [jake,lloyd].
proper_noun(ian_mcdiarmid) --> [ian,mcdiarmid].
proper_noun(ewan_mcgregor) --> [ewan,mcgregor].
proper_noun(hayden_christensen) --> [hayden,christensen].
proper_noun(christopher_lee) --> [christopher,lee].
proper_noun(samuel_l_jackson) --> [samuel,l,jackson].
proper_noun(alec_guinness) --> [alec,guinness].
proper_noun(peter_cushing) --> [peter,cushing].
proper_noun(jimmy_smits) --> [jimmy,smits].
proper_noun(frank_oz) --> [frank,oz].
proper_noun(kenny_baker) --> [kenny,baker].
proper_noun(george_lucas) --> [george,lucas].
proper_noun(star_wars_i) --> [star,wars,i].
proper_noun(star_wars_ii) --> [star,wars,ii].
proper_noun(star_wars_iii) --> [star,wars,iii].
proper_noun(star_wars_iv) --> [star,wars,iv].
proper_noun(qui_gon_jinn) --> [qui,gon,jinn].    
proper_noun(luke_skywalker) --> [luke,skywalker].
proper_noun(han_solo) --> [han,solo].
proper_noun(princess_leia) --> [princess,leia].
proper_noun(padme_amidala) --> [padme,amidala].
proper_noun(obi_wan_kenobi) --> [obi,wan,kenobi].
proper_noun(anakin_skywalker) --> [anakin,skywalker].
proper_noun(palpatine) --> [palpatine].
proper_noun(count_dooku) --> [count,dooku].
proper_noun(mace_windu) --> [mace,windu].
proper_noun(grand_moff_tarkin) --> [grand,moff,tarkin].
proper_noun(bail_organa) --> [bail,organa].
proper_noun(r2d2) --> [r2d2].
proper_noun(yoda) --> [yoda].

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%		       NAME FORMAT			    %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%% Maps internal atom names to nicely formatted strings

formatname(mark_hamill, 'Mark Hamill').
formatname(harrison_ford, 'Harrison Ford').
formatname(carrie_fisher, 'Carrie Fisher').
formatname(liam_neeson, 'Liam Neeson').
formatname(natalie_portman, 'Natalie Portman').
formatname(jake_lloyd, 'Jake Lloyd').
formatname(ian_mcdiarmid, 'Ian McDiarmid').
formatname(ewan_mcgregor, 'Ewan McGregor').
formatname(hayden_christensen, 'Hayden Christensen').
formatname(christopher_lee, 'Christopher Lee').
formatname(samuel_l_jackson, 'Samuel L. Jackson').
formatname(alec_guinness, 'Alec Guinness').
formatname(peter_cushing, 'Peter Cushing').
formatname(jimmy_smits, 'Jimmy Smits').
formatname(frank_oz, 'Frank Oz').
formatname(kenny_baker, 'Kenny Baker'). 
formatname(george_lucas, 'George Lucas').
formatname(star_wars_i, 'Star Wars I').
formatname(star_wars_ii, 'Star Wars II').
formatname(star_wars_iii, 'Star Wars III').
formatname(star_wars_iv, 'Star Wars IV').
formatname(qui_gon_jinn, 'Qui-Gon Jinn').
formatname(luke_skywalker, 'Luke Skywalker').
formatname(anakin_skywalker, 'Anakin Skywalker').
formatname(han_solo, 'Han Solo').
formatname(princess_leia, 'Princess Leia').
formatname(padme_amidala, 'Padme Amidala').
formatname(obi_wan_kenobi, 'Obi Wan Kenobi').
formatname(palpatine, 'Palpatine').
formatname(count_dooku, 'Count Dooku').
formatname(mace_windu, 'Mace Windu').
formatname(grand_moff_tarkin, 'Grand Moff Tarkin').
formatname(bail_organa, 'Bail Organa').
formatname(yoda, 'Yoda').
formatname(r2d2, 'R2-D2').
    

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%		      DATABASE (Facts)			    %%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% Episode I
plays(liam_neeson, qui_gon_jinn, star_wars_i).
plays(ewan_mcgregor, obi_wan_kenobi, star_wars_i).
plays(natalie_portman, padme_amidala, star_wars_i).
plays(jake_lloyd, anakin_skywalker, star_wars_i).
plays(ian_mcdiarmid, palpatine, star_wars_i).
directs(george_lucas, star_wars_i).
title_of(star_wars_i, 'The Phantom Menace').

% Episode II
plays(ewan_mcgregor, obi_wan_kenobi, star_wars_ii).
plays(natalie_portman, padme_amidala, star_wars_ii).
plays(hayden_christensen, anakin_skywalker, star_wars_ii).
plays(christopher_lee, count_dooku, star_wars_ii).
plays(samuel_l_jackson, mace_windu, star_wars_ii).
directs(george_lucas, star_wars_ii).
title_of(star_wars_ii, 'Attack of the Clones').

% Episode III
plays(hayden_christensen, anakin_skywalker, star_wars_iii).
plays(jimmy_smits, bail_organa, star_wars_iii).
plays(frank_oz, yoda, star_wars_iii).
plays(kenny_baker, r2d2, star_wars_iii).
plays(ewan_mcgregor, obi_wan_kenobi, star_wars_iii).
directs(george_lucas, star_wars_iii).
title_of(star_wars_iii, 'Revenge of the Sith').

% Episode IV
plays(mark_hamill, luke_skywalker, star_wars_iv).
plays(harrison_ford, han_solo, star_wars_iv).
plays(carrie_fisher, princess_leia, star_wars_iv).
plays(alec_guinness, obi_wan_kenobi, star_wars_iv).
plays(peter_cushing, grand_moff_tarkin, star_wars_iv).
directs(george_lucas, star_wars_iv).
title_of(star_wars_iv, 'A New Hope').
