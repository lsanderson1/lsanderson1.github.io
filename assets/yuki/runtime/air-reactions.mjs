// Each transition sheet contains six lead-in and six return drawings.
// Return poses can belong to a different half of the continuous wingbeat.
export const airClips={
 amused:{key:'hoverAmused',transitionKey:'hoverAmusedTransition',exitAfterSlots:42,exitPhase:6},
 // Two speaking wingbeats, then a quiet return; never slow the wing clock.
 talkOpen:{key:'hoverTalkOpen',transitionKey:'hoverTalkOpenTransition',exitAfterSlots:30,exitPhase:6},
 talkExplain:{key:'hoverTalkExplain',transitionKey:'hoverTalkExplainTransition',exitAfterSlots:30,exitPhase:6},
 thoughtful:{key:'hoverThoughtful',transitionKey:'hoverThoughtfulTransition',exitAfterSlots:42,exitPhase:6},
 surprised:{key:'hoverSurprised',transitionKey:'hoverSurprisedTransition',exitAfterSlots:42,exitPhase:6},
 shy:{key:'hoverShy',transitionKey:'hoverShyTransition',exitAfterSlots:42,exitPhase:6},
 proud:{key:'hoverProud',transitionKey:'hoverProudTransition',exitAfterSlots:42,exitPhase:6},
 reassuring:{key:'hoverReassuring',transitionKey:'hoverReassuringTransition',exitAfterSlots:42,exitPhase:6},
 confused:{key:'hoverConfused',transitionKey:'hoverTransition',exitAfterSlots:36,exitPhase:0},
 // This bridge's return is the upstroke (phases 6–11), so finish at phase 0.
 delighted:{key:'hoverDelighted',transitionKey:'hoverDelightedTransition',exitAfterSlots:42,exitPhase:6},
};
