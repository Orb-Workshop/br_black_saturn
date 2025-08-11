//@ts-nocheck
import { Instance } from "cspointscript";

let target_relay = null; // logic_relay entity which ends the round.

function EndRound() {
    if (target_relay !== null) {
	Instance.Msg("Firing End Round Relay Trigger: " + target_relay);
	Instance.EntFireBroadcast(target_relay, "Trigger");

    }
    else {
	Instance.Msg("ERROR - Battle Royale Mode: Unable to End Round, Not Initialized");
    }
}

// Switches all T players over to CT side.
function PopulateCTs() {
    let players = GetPlayers();
    players.forEach((p) => {
	if (p.GetTeamNumber() == 2) { // T
	    p.ChangeTeam(3);
	}
    });
}

function GetPlayers() {
    let max_player_slots = 999;
    let players = [];
    for (let pid = 0; pid < max_player_slots; pid++) {
	let player_pawn = Instance.GetPlayerPawn(pid);
	if (player_pawn) players.push(player_pawn);
    }
    return players;
}

Instance.PublicMethod("InitBattleRoyale", (targetname: string) => {
    target_relay = targetname;
    Instance.Msg("Enabled Battle Royale Mode!");
    Instance.Msg("- Point Server Command Entity ID: " + targetname);
    Instance.Msg("- Forcing everyone on to CT side...");
    PopulateCTs();
});

// Should be called upon a 'player_death' event from an EventListener Entity
Instance.PublicMethod("CheckBattleRoyale", () => {
    let ct_players = GetPlayers().filter((p) => p.GetTeamNumber() == 3); // CTs
    if (ct_players.length <= 1) {
	Instance.Msg("Battle Royale Mode: Winner Winner, Chicken Dinner!");
	EndRound();
    }
    else {
	Instance.Msg("Battle Royale Mode: Players Remaining - " + players.length);
    }
});
