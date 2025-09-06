//@ts-nocheck
import { Instance } from "cspointscript";

// Breakout Logic Relays
const TARGET_END_ROUND_HOOK = "brm.end_round_hook";
const TARGET_DUEL_HOOK = "brm.player_duel_hook";
const TARGET_PLAYER_DEATH_HOOK = "brm.player_death_hook";

// Global Variables
let total_alive_players = 0;

function GetPlayers() {
    let max_player_slots = 999;
    let players = [];
    for (let pid = 0; pid < max_player_slots; pid++) {
	let player_pawn = Instance.GetPlayerPawn(pid);
	if (player_pawn) players.push(player_pawn);
    }
    return players;
}


function GetCTPlayers() {
   return GetPlayers().filter((p) => p.GetTeamNumber() == 3); // CTs
}


// Switches all T players over to CT side.
function PopulateCTs() {
    let players = GetPlayers();
    players.forEach((p) => {
	if (p.GetTeamNumber() == 2) { // T
	    p.ChangeTeam(3); // CT
	}
    });
}


Instance.PublicMethod("InitBattleRoyale", () => {
    Instance.Msg("Enabled Battle Royale Mode!");
    Instance.Msg("- Forcing Ts on to CT side...");
    PopulateCTs();
});

// Call at freeze_time.
Instance.PublicMethod("StartBattleRoyale", () => {
    total_alive_players = GetCTPlayers().length;
});

// Should be called upon a 'player_death' event from an EventListener Entity
Instance.PublicMethod("CheckBattleRoyale", () => {
    total_alive_players--;
    
    if (total_alive_players <= 1) {
	Instance.Msg("Battle Royale Mode: Winner Winner, Chicken Dinner!");
	Instance.EntFireBroadcast(TARGET_END_ROUND_HOOK, "Trigger");
    }
    else if (total_alive_players == 2) { // Duel
	Instance.Msg("Duel!");
	Instance.EntFireBroadcast(TARGET_DUEL_HOOK, "Trigger");
    }
    else {
	Instance.Msg("Battle Royale Mode: Players Remaining - " +
	    total_alive_players);
	Instance.EntFireBroadcast(TARGET_PLAYER_DEATH_HOOK, "Trigger");
    }
});
