// Assuming the spells() function is provided
let spell = spells();

Hooks.once('ready', async function() {
	// Register the setting
	game.settings.register("lgs-genesys-spell-selector", "magicKnowledgeSkill", {
		name: "Magic Knowledge Skill",
		hint: "Select primary magic skill for setting",
		scope: "world",
		config: true,
		type: String,
		choices: {},  // We'll populate this later with the options
		default: "default",
		onChange: value => console.log(`Magic Knowledge Skill set to ${value}`)
	});

	// Populate the dropdown choices with skills
	let skilltheme = game.settings.storage.get("world").find(entry => entry.key === "starwarsffg.skilltheme").value;
	// default to SW
	if (skilltheme == undefined) skilltheme = "starwars";
	let customSettingSkills = game.settings.storage.get("world").find(entry => entry.key === "starwarsffg.arraySkillList");

	let defaultSkillList;
	if (!customSettingSkills) {
		defaultSkillList = game.settings.settings.get("starwarsffg.arraySkillList").default.filter(i => i.id == skilltheme)[0].skills;
	} else {
		defaultSkillList = customSettingSkills.value.filter(i => i.id == skilltheme)[0].skills;
	}
	let keys = Object.keys(defaultSkillList);
	keys.sort();
	let csvSkills = keys.join(',');

	game.settings.settings.get("lgs-genesys-spell-selector.magicKnowledgeSkill").choices = csvSkills.split(',').reduce((choices, skill) => {
		choices[skill] = skill;
		return choices;
	}, { "default": "Select Magic Skill" });


})

Hooks.on('renderActorSheet', (app, html, data) => {
    let actor = app.actor;
    let header = html.find('.window-header .window-title');
    let button = $(`<a class="header-button"><i class="fas fa-question-circle"></i> Q</a>`);

    button.click(async () => {
        // Display dialog with dropdown
        let csvOptions = csvSkills.split(',').map(skill => `<option value="${skill}">${skill}</option>`).join('');
        let currentSkill = actor.getFlag("lgs-spell-selector", "skill") || "default";

        let dialogContent = `
            <form>
                <div class="form-group">
                    <label>Choose a skill:</label>
                    <select id="selectSkill">
                        <option value="default">Default</option>
                        ${csvOptions}
                    </select>
                </div>
            </form>
        `;

        let d = new Dialog({
            title: "Select Skill",
            content: dialogContent,
            buttons: {
                ok: {
                    label: "OK",
                    callback: html => {
                        let selectedSkill = html.find("#selectSkill").val();
                        actor.setFlag("lgs-spell-selector", "skill", selectedSkill);
                    }
                }
            }
        });
        d.render(true);
    });

    header.append(button);
});



// Hook to run code when the canvas is ready
Hooks.on("canvasReady", () => {
    // Attach a right-click event handler to the canvas stage
    canvas.stage.on('rightdown', onRightClick);
});

// Function to handle the right-click event
function onRightClick(event) {
    if (!event.shiftKey) return; // Only proceed if the shift key is held

    const controlledTokens = canvas.tokens.controlled;
    if (controlledTokens.length === 0) return; // Ensure a token is controlled

    const target = controlledTokens[0]; // Get the first controlled token
    if (!target) return;

    const actor = target.actor;
    if (!actor) return;

    let actorSkillLabel = ""; // Variable to store the actorSkill label
    let actorSkillCharacteristic = ""; // Variable to store the actorSkill characteristic

    // Loop through each skill in the spell and match it against the actor's skills
    const matchingSpells = spell.filter(s => {
        return s.skills.some(skill => {
            const actorSkill = actor.system.skills[capitalizeFirstLetter(skill.name)];
            if (actorSkill && actorSkill.careerskill) {
                actorSkillLabel = actorSkill.label; // Store the skill label
                actorSkillCharacteristic = actorSkill.characteristic; // Store the skill characteristic
                return true;
            }
            return false;
        });
    });

    if (matchingSpells.length > 0) {
        // If there are matching spells, create and show the dialog
        createSpellSelectionDialog(matchingSpells, actorSkillLabel, actorSkillCharacteristic);
    }
}

// Utility function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to create and show the spell selection dialog
function createSpellSelectionDialog(matchingSpells, actorSkillLabel, actorSkillCharacteristic) {
    const buttons = {};

    matchingSpells.forEach(sp => {
        buttons[sp.name] = {
            label: sp.name,
            callback: () => showSpellDetailsDialog(sp, actorSkillLabel, actorSkillCharacteristic)
        };
    });

    new Dialog({
        title: "Select a Spell",
        content: "<div style='background-color:grey; padding:10px;'>Select a spell:</div>",
        buttons: buttons,
        default: "none"
    }).render(true);
}

// Function to show the details of the selected spell
function showSpellDetailsDialog(spell, actorSkillLabel, actorSkillCharacteristic) {
    const spellDifficultyMapping = {
        "easy": 1,
        "average": 2,
        "hard": 3,
        "daunting": 4
    };

    let baseDifficulty = spellDifficultyMapping[spell.difficulty.toLowerCase()] || 0;
    let calculatedDifficulty = baseDifficulty;

    let content = `
        <form>
            <div>
                <label>Additional Description:</label>
                <textarea name="additionalDescription" style="width: 100%; height: 60px; overflow-y: scroll;"></textarea>
            </div>
            <div>
                <strong>Skill: </strong>
                <span id="spellSkill">${actorSkillLabel}</span>
                <span id="skillAtt">${actorSkillCharacteristic}</span>
            </div>
            <div>
                <label>Spell Name: </label><input type='text' name='spellName' placeholder='Magic Spell'/>
            </div>
            <div>
                <label>Action: </label><input type='text' name='action' value='${spell.name}' disabled/>
            </div>
            <div>
                <label>Concentration: </label><input type='text' name='concentration' value='${spell.concentration ? "Yes" : "No"}' disabled/>
            </div>
            <div>
                <label>Difficulty: </label><input type='text' name='difficulty' value='${baseDifficulty}' disabled/>
            </div>
            <div>
                <strong>Current Difficulty: </strong><span id="currentDifficulty">${calculatedDifficulty}</span>
            </div>
            <div style='height: 100px; overflow-y: scroll;'>
                <label>Description: </label><p>${spell.narrative.join("<br>")}</p><p>${spell.structured.join("<br>")}</p>
            </div>
            <table style='width:100%; border-collapse: collapse;' border='1'>
                <tr>
                    <th>Free</th>
                    <th>Selected</th>
                    <th>Name</th>
                    <th>Diff</th>
                    <th>Desc</th>
                </tr>`;

    spell.additionalEffects.forEach(effect => {
        let freeSelector = effect.repeatable ?
            `<select id="rangeFree" name='effect${effect.name}_free'>
                <option value='0'>0</option>
                <option value='1'>1</option>
                <option value='2'>2</option>
                <option value='3'>3</option>
                <option value='4'>4</option>
                <option value='5'>5</option>
            </select>` :
            `<input type='checkbox' name='effect${effect.name}_free' class='free-checkbox'/>`;

        let selectedSelector = effect.repeatable ?
            `<select name='effect${effect.name}_selected' class="difficulty-selector">
                <option value='0'>0</option>
                <option value='1'>1</option>
                <option value='2'>2</option>
                <option value='3'>3</option>
                <option value='4'>4</option>
                <option value='5'>5</option>
            </select>` :
            `<input type='checkbox' name='effect${effect.name}_selected' class="difficulty-checkbox selected-checkbox"/>`;

        content += `<tr>
                    <td>${freeSelector}</td>
                    <td>${selectedSelector}</td>
                    <td>${effect.name}</td>
                    <td class="difficulty-mod">${effect.difficultyMod}</td>
                    <td>${effect.description.join("<br>")}</td>
                </tr>`;
    });

    content += `</table></form>`;

    const dialog = new Dialog({
        title: "Spell Details",
        content: content,
        buttons: {
            create: {
                label: "Create Spell",
                callback: (html) => createSpellItem(html, spell)
            }
        },
        render: html => {
            // Mutual exclusivity between Free and Selected checkboxes
            html.find(".free-checkbox").on("change", function () {
                if ($(this).is(":checked")) {
                    $(this).closest("tr").find(".selected-checkbox").prop("checked", false);
                }
            });

            html.find(".selected-checkbox").on("change", function () {
                if ($(this).is(":checked")) {
                    $(this).closest("tr").find(".free-checkbox").prop("checked", false);
                }
            });

            // Update the current difficulty whenever a checkbox or dropdown is changed
            html.find(".difficulty-checkbox, .difficulty-selector").on("change", function () {
                let newDifficulty = baseDifficulty;

                html.find("tr").each((index, row) => {
                    const checkbox = $(row).find(".difficulty-checkbox");
                    const dropdown = $(row).find(".difficulty-selector");
                    const diffValue = parseInt($(row).find(".difficulty-mod").text()) || 0;

                    if (checkbox.is(":checked")) {
                        newDifficulty += diffValue;
                    }

                    if (dropdown.length && parseInt(dropdown.val()) > 0) {
                        newDifficulty += parseInt(dropdown.val());
                    }
                });

                html.find("#currentDifficulty").text(newDifficulty);
            });
        }
    });

    dialog.render(true, { id: "spellDetailsGenesys", width: 1000, height: 800, resizable: true });
}

// Function to create the spell item
function createSpellItem(html, spell) {
    const actor = canvas.tokens.controlled[0]?.actor;
    if (!actor) return;

    let spellName = html.find("[name='spellName']").val() || "Magic Spell";
    let calculatedDifficulty = parseInt(html.find("#currentDifficulty").text());

    // Retrieve the value of spellSkill from the dialog
    let spellSkill = html.find("#spellSkill").text().trim();

    // Get the selected skill from the actor's flags or default
    let selectedSkill = actor.getFlag("lgs-spell-selector", "skill") || "default";
    let configuredSkill = game.settings.get("lgs-spell-selector", "magicKnowledgeSkill");
    let skillToUse = selectedSkill === "default" ? configuredSkill : selectedSkill;

    // Get the ranks from the actor's skills
    let skillRanks = actor.system.skills[skillToUse]?.value || 0;

    // Append "(X ranks)" to "Knowledge" in the description if applicable
    let description = spell.structured.join("<br>");
    description = description.replace(/Knowledge/gi, `Knowledge (${skillRanks} ranks)`);

    // Construct the item description
    const itemDescription = `
        ${html.find("[name='additionalDescription']").val() || ""}
        <b>Action:</b> ${spell.name}<br>
        <b>Concentration:</b> ${spell.concentration ? "Yes" : "No"}<br>
        <b>Difficulty:</b> ${calculatedDifficulty}<br>
        <b>Effects:</b> ${effectNames}<br>
        <p>${description}</p>
    `;

    // Create the item data
    const itemData = {
        name: spellName,
        type: "weapon",
        system: {
            description: itemDescription,
            damage: { value: actor.system.characteristics[spellSkill]?.value || 0 },
            crit: { value: isDeadly ? 2 : 0 },
            range: { value: rangeValue },
            skill: { value: spellSkill },
            attributes: {
                [attrKey]: {
                    modtype: "Dice Modifiers",
                    value: Math.max(calculatedDifficulty - 2, 1),
                    mod: "Add Difficulty"
                }
            }
        }
    };

    // Add the item to the actor's inventory
    //actor.createEmbeddedDocuments("Item", [itemData]);
	doit();
}

async function doit(){
	// Step 1: Create the dice pool with your custom values
let dicePool = new DicePoolFFG({
    difficulty: 2,    // Example: 2 difficulty dice
    ability: 3,       // Example: 3 ability dice
    proficiency: 1,   // Example: 1 proficiency die
    boost: 1,         // Example: 1 boost die
    setback: 2,       // Example: 2 setback dice
    challenge: 1      // Example: 1 challenge die
});

// Step 2: Convert the dice pool to a rollable expression
let rollExpression = dicePool.renderDiceExpression();
console.info(rollExpression)
// Step 3: Create the roll object
let roll = new RollFFG(rollExpression);

// Step 4: Evaluate the roll
await roll.evaluate();

// Step 5: Optionally send the roll results to chat
await roll.toMessage({
    user: game.user.id,
    flavor: "Custom Dice Roll",  // Optional flavor text
});
}

function spells() {
   return [
      {
         "name": "Attack",
         "page": 215,
         "concentration": false,
         "difficulty": "easy",
         "skills": [{"name": "arcana"}, {"name": "divine"}, {"name": "primal"}],
		 "range": 1,
         "narrative": [
            "Any combat check or action that deals damage or strain to an enemy."
         ],
         "structured": [
            "Magic attacks follow normal combat check rules using magic skills. Select a target at short range. Default difficulty is [di]. Damage equals the characteristic linked to the skill, plus 1 per uncanceled [su]. Critical Injury requires [tr]. Choose additional effects before the check."
         ],
         "additionalEffects": [
            {
               "name": "Blast",
               "description": [
                  "Gains the Blast quality with a rating equal to ranks in Knowledge."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Close Combat",
               "description": [
                  "Select a target engaged with your character."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Deadly",
               "description": [
                  "Gains a Critical rating of 2 and Vicious quality equal to ranks in Knowledge."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Fire",
               "description": [
                  "Gains the Burn quality with a rating equal to ranks in Knowledge."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Holy/Unholy (Divine Only)",
               "description": [
                  "Each [su] deals +2 damage against targets opposing the character's faith."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Ice",
               "description": [
                  "Gains the Ensnare quality with a rating equal to ranks in Knowledge."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Impact",
               "description": [
                  "Gains the Knockdown quality and Disorient quality equal to ranks in Knowledge."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Lightning",
               "description": [
                  "Gains the Stun quality equal to ranks in Knowledge and Auto-fire quality."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Manipulative (Arcana Only)",
               "description": [
                  "Spend [ad] to move the target one range band in any direction."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Non-Lethal (Primal Only)",
               "description": [
                  "Gains the Stun Damage quality."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Range",
               "description": [
                  "Increase the range by one range band."
               ],
               "difficultyMod": 1,
               "repeatable": true
            },
            {
               "name": "Destructive",
               "description": [
                  "Gains the Sunder and Pierce quality equal to ranks in Knowledge."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Empowered",
               "description": [
                  "Deals damage equal to twice the characteristic. If it has Blast, affects all within short range."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Poisonous",
               "description": [
                  "If the attack deals damage, the target makes a [di][di][di] Resilience check or suffers wounds and strain equal to ranks in Knowledge. This counts as a poison."
               ],
               "difficultyMod": 2,
               "repeatable": false
            }
         ]
      },
      {
         "name": "Augment",
         "page": 215,
         "concentration": true,
         "difficulty": "[di][di]",
         "skills": [{"name": "divine"}, {"name": "primal"}],
		 "range": 0,
         "narrative": [
            "Magically enhance characters or objects."
         ],
         "structured": [
            "Select a target engaged with the caster. Default difficulty is [di][di]. Success increases the ability of any skill checks by one."
         ],
         "additionalEffects": [
            {
               "name": "Divine Health (Divine Only)",
               "description": [
                  "Increase wound threshold by a value equal to ranks in Knowledge."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Haste",
               "description": [
                  "Targets can perform a second maneuver without spending strain."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Primal Fury (Primal Only)",
               "description": [
                  "Add damage equal to ranks in Knowledge to unarmed combat checks, Critical rating becomes 3."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Range",
               "description": [
                  "Increase the range by one range band."
               ],
               "difficultyMod": 1,
               "repeatable": true
            },
            {
               "name": "Swift",
               "description": [
                  "Ignore difficult terrain and cannot be immobilized."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Additional Target",
               "description": [
                  "Affects one additional target within range. Spend [ad] to affect one additional target within range."
               ],
               "difficultyMod": 2,
               "repeatable": false
            }
         ]
      },
      {
         "name": "Barrier",
         "page": 216,
         "concentration": true,
         "difficulty": "[di]",
         "skills": [{"name": "arcana"}, {"name": "divine"}],
		 "range": 0,
         "narrative": [
            "Reduces incoming damage and has narrative uses."
         ],
         "structured": [
            "Select a target engaged with the caster. Default difficulty is [di]. Success reduces damage of all hits by one, plus one per uncanceled [su]."
         ],
         "additionalEffects": [
            {
               "name": "Additional Target",
               "description": [
                  "Affects one additional target within range. Spend [ad] to affect one additional target within range."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Range",
               "description": [
                  "Increase the range by one range band."
               ],
               "difficultyMod": 1,
               "repeatable": true
            },
            {
               "name": "Add Defense",
               "description": [
                  "Each target gains ranged and melee defense equal to ranks in Knowledge."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Empowered",
               "description": [
                  "Reduces damage equal to the number of uncanceled [su]."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Reflection (Arcana Only)",
               "description": [
                  "If an opponent makes a magic attack against an affected target and generates [th][th][th] or [de], they suffer a hit equal to the attack's damage."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Sanctuary (Divine Only)",
               "description": [
                  "Opponents determined by the GM to be the antithesis of the character's faith automatically disengage and cannot engage them."
               ],
               "difficultyMod": 2,
               "repeatable": false
            }
         ]
      },
      {
         "name": "Conjure",
         "page": 216,
         "concentration": true,
         "difficulty": "[di]",
         "skills": [{"name": "arcana"}, {"name": "primal"}],
		 "range": 0,
         "narrative": [
            "Summon allies or create items."
         ],
         "structured": [
            "Default difficulty is [di]. Success summons a simple tool, one-handed weapon, or minion no larger than silhouette 1."
         ],
         "additionalEffects": [
            {
               "name": "Additional Summon",
               "description": [
                  "Summon one additional item, weapon, or creature. Spend [ad][ad] to summon one additional item, weapon, or creature."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Medium Summon",
               "description": [
                  "Summon a more complicated tool, rival no larger than silhouette 1, or a two-handed melee weapon."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Range",
               "description": [
                  "Increase the range by one range band."
               ],
               "difficultyMod": 1,
               "repeatable": true
            },
            {
               "name": "Summon Ally",
               "description": [
                  "Summoned creature is friendly and obeys commands."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Grand Summon",
               "description": [
                  "Summon a rival up to silhouette 3."
               ],
               "difficultyMod": 2,
               "repeatable": false
            }
         ]
      },
      {
         "name": "Curse",
         "page": 217,
         "concentration": true,
         "difficulty": "[di][di]",
         "skills": [{"name": "arcana"}, {"name": "divine"}],
		 "range": 1,
         "narrative": [
            "Inflict negative effects on a character."
         ],
         "structured": [
            "Default difficulty is [di][di]. Success decreases the ability of the target's skill checks by one."
         ],
         "additionalEffects": [
            {
               "name": "Enervate",
               "description": [
                  "Target suffers 1 additional strain if they suffer strain for any reason."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Misfortune",
               "description": [
                  "Change one [se] to a face displaying [th] after the target makes a check."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Range",
               "description": [
                  "Increase the range by one range band."
               ],
               "difficultyMod": 1,
               "repeatable": true
            },
            {
               "name": "Additional Target",
               "description": [
                  "Affects one additional target within range. Spend [ad] to affect one additional target within range."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Despair (Divine Only)",
               "description": [
                  "Reduce strain and wound thresholds by an amount equal to ranks in Knowledge."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Doom (Arcana Only)",
               "description": [
                  "Change any one die not displaying [tr] or [de] to a different face."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Paralyzed",
               "description": [
                  "Target is staggered for the duration of the spell."
               ],
               "difficultyMod": 3,
               "repeatable": false
            }
         ]
      },
      {
         "name": "Dispel",
         "page": 217,
         "concentration": false,
         "difficulty": "[di][di][di]",
         "skills": [{"name": "arcana"}],
		 "range": 1,
         "narrative": [
            "Nullify magic effects."
         ],
         "structured": [
            "Default difficulty is [di][di][di]. Success ends the effects of a spell on the target."
         ],
         "additionalEffects": [
            {
               "name": "Range",
               "description": [
                  "Increase the range by one range band."
               ],
               "difficultyMod": 1,
               "repeatable": true
            },
            {
               "name": "Additional Target",
               "description": [
                  "Affects one additional target within range. Spend [ad] to affect one additional target within range."
               ],
               "difficultyMod": 2,
               "repeatable": false
            }
         ]
      },
      {
         "name": "Heal",
         "page": 217,
         "concentration": false,
         "difficulty": "[di]",
         "skills": [{"name": "divine"}, {"name": "primal"}],
		 "range": 0,
         "narrative": [
            "Remove damage or strain from a character."
         ],
         "structured": [
            "Default difficulty is [di]. Success heals 1 wound per uncanceled [su] and 1 strain per uncanceled [ad]."
         ],
         "additionalEffects": [
            {
               "name": "Additional Target",
               "description": [
                  "Affects one additional target within range. Spend [ad] to affect one additional target within range."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Range",
               "description": [
                  "Increase the range by one range band."
               ],
               "difficultyMod": 1,
               "repeatable": true
            },
            {
               "name": "Restoration",
               "description": [
                  "End one ongoing status effect on the target."
               ],
               "difficultyMod": 1,
               "repeatable": false
            },
            {
               "name": "Heal Critical",
               "description": [
                  "Heal one Critical Injury the target is suffering."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Revive Incapacitated",
               "description": [
                  "Select targets who are incapacitated."
               ],
               "difficultyMod": 2,
               "repeatable": false
            },
            {
               "name": "Resurrection",
               "description": [
                  "Select a target who died during this encounter. If successful, the target is restored to life with wounds equal to their wound threshold. Failure prevents any further resurrection attempts."
               ],
               "difficultyMod": 4,
               "repeatable": false
            }
         ]
      },
      {
         "name": "Utility",
         "page": 214,
         "concentration": false,
         "difficulty": "[di]",
		 "range": 1,
         "skills": [{"name": "arcana"}, {"name": "divine"}, {"name": "primal"}],
         "narrative": [
            "Minor magical effects with narrative use."
         ],
         "structured": [
            "Utility magic lacks structured effects. The check should always be [di]."
         ],
         "additionalEffects": []
      }
   ];
}
