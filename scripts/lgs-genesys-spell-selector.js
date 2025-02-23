// Define global variables
let csvSkills;
let selectedActor;
let selectedSkill;
let magicSkill;
let selectedEffects = [];
let magicSkillKey;
let statRank;
let totalSelected // selected difficulty
let attackspell;

// Add the font awesome list icon to the actor sheet header for characters
Hooks.on("getActorSheetHeaderButtons", (sheet, buttonArray) => {
    // Only proceed if actor type is "character"
    if (sheet.actor.type == "vehicle") return;

    // Define the new button
    const spellTalentsButton = {
        label: game.i18n.localize("Spell Talents"), // Localized label if needed
        class: "spell-talents-button",
        icon: "fas fa-list",
        onclick: () => {
            // Open the Talent Selector dialog
            openTalentSelector(sheet.actor);
        }
    };

    // Add the button to the header
    buttonArray.unshift(spellTalentsButton); // `unshift` to add it at the beginning, or `push` for the end
});

async function openTalentSelector(actor) {
    // Get all items of type "talent" from the actor and sort by name
	
    const talents = actor.items.filter(i => i.type === "talent").sort((a, b) => a.name.localeCompare(b.name));

    // Build the dialog content with talent.uuid in value
    let options = talents.map(talent => `<option value="${talent.uuid}">${talent.name}</option>`).join('');
    let selectedTalents = actor.getFlag('lgs-genesys-spell-selector', 'selectedTalents') || [];

    if (!Array.isArray(selectedTalents)) {
        selectedTalents = selectedTalents.split(',').filter(s => s);
    }

    // Normalize selectedTalents to only UUIDs
    const normalizedSelectedTalents = selectedTalents.map(entry => entry.split(',')[0]);

    let selectedTalentsHTML = '';
	if (normalizedSelectedTalents.length > 0) {
		let talentsArray = await Promise.all(selectedTalents.map(entry => {
			let [uuid, scalingFlag] = entry.split(',');
			return fromUuid(uuid);
		}));
		selectedTalentsHTML = talentsArray.map((talent, index) => {
			if (!talent) return '';
			const [uuid, scalingFlag] = selectedTalents[index].split(',');
			const scalingText = (scalingFlag === 'true') ? ' (Scaling)' : '';
			return `<li>${talent.name}${scalingText} <a data-tooltip="Spell Talents" class="remove-talent" data-uuid="${uuid}"><i class="fas fa-times"></i></a></li>`;
		}).join('');
	}

    // Retrieve the stored casting penalty
    let storedPenalty = actor.getFlag("lgs-genesys-spell-selector", "castingPenalty") || "";

    // Casting Penalty dropdown
    let castingPenaltyDropdown = `
      <br>
      <label for="castingPenalty"><b>Casting Penalty:</b></label>
      <select id="castingPenalty" style="margin-left: 5px;">
        <option value=""></option>
        <option value="1S">1 Setback</option>
        <option value="2S">2 Setback</option>
        <option value="1U">1 Upgrade</option>
        <option value="2U">2 Upgrades</option>
        <option value="3U">3 Upgrades</option>
        <option value="4U">4 Upgrades</option>
        <option value="5U">5 Upgrades</option>
        <option value="6U">6 Upgrades</option>
        <option value="7U">7 Upgrades</option>
        <option value="8U">8 Upgrades</option>
        <option value="9U">9 Upgrades</option>
        <option value="10U">10 Upgrades</option>
      </select>
    <br>Primarily for use with Magic Mega City setting book` ;

    let content = `
	Select the talents to be available to the spell selector. <b>Scaling</b> indicates that a talent allows for strain or other "currency" to be spent for a benefit as "spend 3 strain to add advantage. Click <b>+</b> to add talent to list. <br>
    <div style="display: flex; align-items: center;">
        <select id="talent-selector" style="flex: 1;">${options}</select>
        <label style="margin-left: 5px;">
            <input type="checkbox" id="scaling-checkbox"> Scaling
        </label>
        <button id="add-talent" style="margin-left: 5px; width:50px;"><i class="fas fa-plus"></i></button>
    </div>
    <ul id="selected-talents-list" style="margin-top: 10px; list-style: none; padding: 0;">
        ${selectedTalentsHTML}
    </ul>
    ${castingPenaltyDropdown}
    `;

    // Store the dialog instance in a variable
    let dialog = new Dialog({
        title: "Talent Selector",
        content: content,
        buttons: {
            close: {
                label: "Close"
            }
        },
        render: html => {
            // Set the dropdown to the stored flag value
            html.find('#castingPenalty').val(storedPenalty);

            // Listen for changes in the Casting Penalty dropdown
            html.find('#castingPenalty').change(ev => {
                actor.setFlag("lgs-genesys-spell-selector", "castingPenalty", ev.currentTarget.value);
            });

            html.find('#add-talent').click(async ev => {
                const selectedTalentUuid = html.find('#talent-selector').val();
                const selectedTalent = await fromUuid(selectedTalentUuid);
                if (!selectedTalent) return;

                let uuid = selectedTalent.uuid;
                let name = selectedTalent.name;

                const isScaling = html.find('#scaling-checkbox').is(':checked');
                let scalingFlag = isScaling ? 'true' : 'false';
                let talentEntry = `${uuid},${scalingFlag}`;
                // Normalize current flag values to only UUIDs
                let selectedTalents = actor.getFlag('lgs-genesys-spell-selector', 'selectedTalents') || [];
                if (!Array.isArray(selectedTalents)) {
                    selectedTalents = selectedTalents.split(',').filter(s => s);
                }
                const normalizedTalents = selectedTalents.map(entry => entry.split(',')[0]);

                // Check if UUID is already in the list
                if (!normalizedTalents.includes(uuid)) {
                    selectedTalents.push(talentEntry);
                    await actor.setFlag('lgs-genesys-spell-selector', 'selectedTalents', selectedTalents);

                    // Update the dialog content
                    let scalingText = isScaling ? ' (Scaling)' : '';
                    let newItem = `<li>${name}${scalingText} <a class="remove-talent" data-uuid="${uuid}"><i class="fas fa-times"></i></a></li>`;
                    html.find('#selected-talents-list').append(newItem);

                    // Adjust dialog height after adding
                    dialog.setPosition({ height: 'auto' });
                }
            });

            html.on('click', '.remove-talent', async ev => {
                let uuid = ev.currentTarget.dataset.uuid;

                // Remove the matching UUID from the flag, ignoring scaling
                let selectedTalents = actor.getFlag('lgs-genesys-spell-selector', 'selectedTalents') || [];
                if (!Array.isArray(selectedTalents)) {
                    selectedTalents = selectedTalents.split(',').filter(s => s);
                }
                selectedTalents = selectedTalents.filter(entry => !entry.startsWith(uuid));

                await actor.setFlag('lgs-genesys-spell-selector', 'selectedTalents', selectedTalents);

                // Remove the item from the list in the dialog
                $(ev.currentTarget).closest('li').remove();

                // Adjust dialog height after removing
                dialog.setPosition({ height: 'auto' });
            });
        }
    });

    dialog.render(true);
}

Hooks.once("init", function() {
	
game.settings.registerMenu("lgs-genesys-spell-selector", "spellSelectorConfig", {
    name: "Configure Spell Selector",
    label: "Configure Spell Selector",
    hint: "Add spell actions and effects to Spell Selector",
    icon: "fas fa-cogs",
    type: SpellSelectorConfig,
    restricted: true
  });

  game.settings.register("lgs-genesys-spell-selector", "spellSelectorData", {
    name: "Spell Selector Data",
    hint: "Stores all Magic Actions and their Effects for Spell Selector.",
    scope: "world",
    config: false,
    type: Object,
    default: []
  });
	
    // Initialize settings
    game.settings.register("lgs-genesys-spell-selector", "magicKnowledgeSkill", {
        name: "Magic Knowledge Skill",
        hint: "Select primary Knowledge skill for setting",
        scope: "world",
        config: true,
        type: String,
        choices: getDropdownOptions(), // Populates dropdown using csvSkills
        default: "Select Skill", // Default option
        onChange: value => {
            if (value === "Select Skill") {
                ui.notifications.warn("Select Magic knowledge skill for setting.");
            }
        }
    });

    // Define a world setting to track if the instructions should be shown
    game.settings.register("lgs-genesys-spell-selector", "showInstructions", {
        name: "Show instructions on launch",
        hint: "Check this to show the instructions dialog when the game starts.",
        scope: "world",
        config: true,
        default: false,  // Checkbox should be unchecked by default
        type: Boolean,
        onChange: value => {
            if (!value) {
                game.settings.set("lgs-genesys-spell-selector", "dontShowAgain", false);
            }
        }
    });
	
    game.settings.register("lgs-genesys-spell-selector", "resetSpellTableColumns", {
        name: "Reset Spell Table Columns",
        hint: "Remove changes to tables column in Magic Effect List journal",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: async (newVal) => {
            if (newVal) {
                await resetSpellTableColumns();
                // Reset the setting value to false so it acts like a button.
                await game.settings.set("lgs-genesys-spell-selector", "resetSpellTableColumns", false);
            }
        }
    });
	
    // Setting to track if "Don't show again" was selected
    game.settings.register("lgs-genesys-spell-selector", "dontShowAgain", {
        scope: "world",
        config: false,
        default: false,
        type: Boolean
    });
	
	Handlebars.registerHelper("range", function(start, end) {
	  let arr = [];
	  for (let i = start; i < end; i++) {
		arr.push(i);
	  }
	  return arr;
	});

	Handlebars.registerHelper("ifEquals", function(arg1, arg2, options) {
	  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
	});

});

class SpellSelectorConfig extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "spellSelectorConfigDialog",
      title: "Configure Spell Selector",
      template: "modules/lgs-genesys-spell-selector/templates/spell-selector-config.html",
      width: 800,
      height: 900,
      resizable: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "0" }]
    });
  }

  /** @override */
  getData() {
    let actions = game.settings.get("lgs-genesys-spell-selector", "spellSelectorData") || [];
    if (!Array.isArray(actions)) actions = [];
    actions = actions.map(action => {
      if (action.effects && Array.isArray(action.effects)) {
        action.effects = action.effects.map(effect => {
          effect.effects = convertEntitiesToBrackets(effect.effects);
          return effect;
        });
      }
      return action;
    });
    return { actions };
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Existing listeners for Add Magic Action, tab switching, effect adding, etc.
    this.element.on("click", "#addMagicAction", ev => {
      ev.preventDefault();
      console.log("Add Magic Action clicked");
      this._onAddMagicAction();
    });

    this.element.on("click", ".spellTab", ev => {
      const tab = $(ev.currentTarget).data("tab");
      this.element.find(".tab-content").hide();
      this.element.find(`.tab-content[data-tab="${tab}"]`).show();
    });

    this.element.on("change", "input[name^='action-'][name$='-name']", ev => {
      const $input = $(ev.currentTarget);
      const match = $input.attr("name").match(/^action-(\d+)-name$/);
      if (match) {
        const index = match[1];
        const newName = $input.val() || `Action ${index}`;
        this.element.find(`.spellTab[data-tab="${index}"]`).text(newName);
      }
    });

	this.element.on("click", ".add-effect", ev => {
	  ev.preventDefault();
	  // Find the currently visible tab-content (rather than using the button’s data attribute)
	  const $currentTab = this.element.find(".tab-content:visible");
	  if (!$currentTab.length) return ui.notifications.warn("No active tab found.");
	  const actionIndex = Number($currentTab.data("tab"));
	  const $tbody = $currentTab.find("tbody");
	  const newRowIndex = $tbody.find("tr").length;
	  const newRowHtml = `
		<tr>
		  <td>
			<div>
			  <!-- <b>Setting Name:</b> <input style="width:200px; padding-right:10px" type="text" name="action-${actionIndex}-effect-${newRowIndex}-settingName" value=""> -->
			 <strong title="Name of Effect">Name:</strong> <input style="width:200px; padding-right:10px" type="text" name="action-${actionIndex}-effect-${newRowIndex}-effectName" value="">			
			  <b>+${replaceSpellSymbols("[di]")}</b>
			  <select style="padding-right:10px" name="action-${actionIndex}-effect-${newRowIndex}-mod">
				<option value="0">0</option>
				<option value="1">1</option>
				<option value="2">2</option>
				<option value="3">3</option>
				<option value="4">4</option>
				<option value="5">5</option>
			  </select>
			  <strong title="# of allowed levels">Levels:</strong>
			  <select style="padding-right:10px" name="action-${actionIndex}-effect-${newRowIndex}-repeatable">
				<option value="1">1</option>
				<option value="2">2</option>
				<option value="3">3</option>
				<option value="4">4</option>
				<option value="5">5</option>
			  </select>
			   <strong  title="Exact name of skill from sheet">Skill:</strong> <input style="width:100px; padding-right:10px" type="text" name="action-${actionIndex}-effect-${newRowIndex}-skill" value="">
			</div>
			<div style="display:flex">
			  <div style="width:50%; padding-right:10px;">
				<b>Full Description</b> (For Selector)
				<textarea rows="4" wrap="hard" type="text" name="action-${actionIndex}-effect-${newRowIndex}-fullDescription"></textarea>
			  </div>
			  <div style="width:50%">
				<b>Short Description</b> (For Chat output)
				<textarea rows="2" wrap="hard" type="text" name="action-${actionIndex}-effect-${newRowIndex}-effects"></textarea>
			  </div>
			</div>
		  </td>
		  <td style="vertical-align: top; text-align: center;">
			<button type="button" style="background: none; border: none;" class="delete-effect" data-action-index="${actionIndex}" data-effect-index="${newRowIndex}">
			  <i class="fas fa-trash"></i>
			</button>
		  </td>
		</tr>`;
	  $tbody.append(newRowHtml);
	});

    this.element.on("click", ".delete-effect", ev => {
      ev.preventDefault();
      if (confirm("Are you sure you want to delete this effect row?")) {
        $(ev.currentTarget).closest("tr").remove();
      }
    });

this.element.on("click", ".delete-magic-action", ev => {
  ev.preventDefault();
  if (confirm("Are you sure you want to delete this Magic Action and all its data?")) {
    // Find the currently visible (active) tab-content
    const $activeTab = this.element.find(".tab-content:visible");
    if (!$activeTab.length) return ui.notifications.warn("No active Magic Action found.");
    const actionIndex = Number($activeTab.data("tab"));
    
    // Remove the corresponding tab button and its content
    this.element.find(`.spellTab[data-tab="${actionIndex}"]`).remove();
    $activeTab.remove();
  }
});

    // *** New Export Actions listener ***
    this.element.on("click", "#exportActions", async ev => {
      ev.preventDefault();
      const actions = game.settings.get("lgs-genesys-spell-selector", "spellSelectorData") || [];
      const exportData = JSON.stringify(actions, null, 2);
      try {
        await navigator.clipboard.writeText(exportData);
        ui.notifications.info("Magic Actions exported to clipboard.");
      } catch (err) {
        ui.notifications.error("Failed to copy Magic Actions to clipboard.");
      }
    });

    // *** New Import Actions listener ***
    this.element.on("click", "#importActions", ev => {
      ev.preventDefault();
      const currentData = game.settings.get("lgs-genesys-spell-selector", "spellSelectorData") || [];
      const initialText = JSON.stringify(currentData, null, 2);
      let importDialog = new Dialog({
        title: "Import Magic Actions",
        content: `<textarea id="importActionsTextarea" style="width:100%; height:300px;">${initialText}</textarea>`,
        buttons: {
          save: {
            label: "Save Data",
            callback: async (dlgHtml) => {
              const text = dlgHtml.find("#importActionsTextarea").val();
              try {
                const importedData = JSON.parse(text);
                await game.settings.set("lgs-genesys-spell-selector", "spellSelectorData", importedData);
                ui.notifications.info("Magic Actions imported successfully.");
                // Re-render the SpellSelectorConfig dialog to reflect changes.
                this.render();
              } catch (error) {
                ui.notifications.error("Failed to import Magic Actions: Invalid JSON");
              }
            }
          },
          cancel: {
            label: "Cancel"
          }
        },
        default: "cancel"
      });
      importDialog.render(true);
    });
  }

async _onAddMagicAction() {
  const $tabs = this.element.find(".tabs");
  const $content = this.element.find(".content");
  const newIndex = $tabs.find(".spellTab").length;
  const newTabButton = $(`<button class="spellTab rounded-tab" data-tab="${newIndex}" style="width:100px;">Action ${newIndex}</button>`);
  $tabs.append(newTabButton);
  const newTabContentHtml = `
      <div class="tab-content" data-tab="${newIndex}" style="display:none;">
        <h3>Magic Action ${newIndex}</h3>
        <p>
          <label>Difficulty: 
            <select name="action-${newIndex}-difficulty">
              ${[1, 2, 3, 4, 5]
                .map(d => `<option value="${d}">${d}</option>`)
                .join('')}
            </select>
          </label>
          <label>Name: <input type="text" name="action-${newIndex}-name" value=""></label>
        </p>
        <p>
          <label>Causes Wounds<input type="checkbox" name="action-${newIndex}-damage"></label>
        </p>
        <p>
          <label>Skills (CSV): <input type="text" name="action-${newIndex}-skills" value=""></label>
        </p>
        <p>
          <label>Range: <input type="text" name="action-${newIndex}-range" value=""></label>
        </p>
        <p>
          <label>Concentration: <input type="text" name="action-${newIndex}-concentration" value=""></label>
        </p>
        <p>
          <label>Description:<br>
            <textarea name="action-${newIndex}-description"></textarea>
          </label>
        </p>
        <button type="button" class="delete-magic-action" data-action-index="${newIndex}">Delete Magic Action</button>
        <hr>
        <h4>Effects</h4>
        <table border="1" style="width:100%;">
          <thead>
            <tr>
              <th>Setting Name</th>
              <th>Effect Name</th>
              <th>Effects</th>
              <th>Mod</th>
              <th>Repeatable</th>
              <th>Skill</th>
              <th>Full Description</th>
              <th>Strain Cost</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <button type="button" class="add-effect" data-action-index="${newIndex}">Add Effects</button>
      </div>`;
  $content.append(newTabContentHtml);
  newTabButton.click(ev => {
    const tab = $(ev.currentTarget).data("tab");
    this.element.find(".tab-content").hide();
    this.element.find(`.tab-content[data-tab="${tab}"]`).show();
  });
}

	/** @override */
	async _updateObject(event, formData) {
	  // This method parses the flat formData object into a nested structure.
	  let actions = [];
	  for (let key in formData) {
		let value = formData[key];
		// Expected key format: action-{actionIndex}-[effect-{effectIndex}-]field
		let match = key.match(/^action-(\d+)-(?:effect-(\d+)-)?(.+)$/);
		if (!match) continue;
		let actionIndex = Number(match[1]);
		let effectIndex = match[2] !== undefined ? Number(match[2]) : null;
		let field = match[3];
		// For "description", "effects", and "fullDescription", sanitize newlines.
		if (["description", "effects", "fullDescription"].includes(field)) {
		  value = sanitizeText(value);
		}
		if (!actions[actionIndex]) {
		  actions[actionIndex] = { name: "", skills: "", range: "", concentration: "", description: "", effects: [] };
		}
		if (effectIndex !== null) {
		  if (!actions[actionIndex].effects[effectIndex]) {
			actions[actionIndex].effects[effectIndex] = { settingName: "", effectName: "", effects: "", mod: "", repeatable: "", skill: "", fullDescription: "", strainCost: "" };
		  }
		  // If the field is "effects" then convert square brackets to HTML entities.
		  if (field === "effects") {
			value = convertBracketsToEntities(value);
		  }
		  actions[actionIndex].effects[effectIndex][field] = value;
		} else {
		  actions[actionIndex][field] = value;
		}
	  }
	  // Remove any undefined actions and sort alphabetically by action name.
	  actions = actions.filter(action => action);
	  actions.sort((a, b) => a.name.localeCompare(b.name));
	  
	  await game.settings.set("lgs-genesys-spell-selector", "spellSelectorData", actions);
	  ui.notifications.info("Spell Selector configuration saved.");
	  // Note: We intentionally do NOT close the dialog so that it remains open.
	}
	
	/** Override _onSubmit so that the dialog does not close after saving **/
async _onSubmit(event) {
  event.preventDefault();
  const formData = this._getSubmitData();
  await this._updateObject(event, formData);
  // Do not call this.close(), leaving the dialog open.
}

}

Hooks.once('ready', async function() {
    if (!game.user.isGM) return;
    const dontShowAgain = game.settings.get("lgs-genesys-spell-selector", "dontShowAgain");
    const spellHelp = `<p>The <em>Genesys Spell Selector</em> journal is used with the module of the same name to create "on the fly" spells. It is customizable and additional effects or actions may be added.</p>
        <!-- Instructions content -->
        <label><input type="checkbox" id="dontShowAgainCheckbox"> Don't Show Again</label>`;

    if (!dontShowAgain) {
        let d = new Dialog({
            title: "Genesys Spell Selector",
            content: spellHelp,
            buttons: {
                ok: {
                    label: "OK",
                    callback: () => {
                        let dontShowAgainChecked = document.getElementById("dontShowAgainCheckbox").checked;
                        if (dontShowAgainChecked) {
                            game.settings.set("lgs-genesys-spell-selector", "dontShowAgain", true);
                        }
                    }
                }
            },
            default: "ok"
        });
        d.render(true, { id: "GenesysSpellInstruction", width: 900, resizable: true });
    }
});

Hooks.on("closeSettingsConfig", async function(settingsConfig) {
    const showInstructions = game.settings.get("lgs-genesys-spell-selector", "showInstructions");

    if (showInstructions) {
        // Clear the "Don't Show Again" flag
        await game.settings.set("lgs-genesys-spell-selector", "dontShowAgain", false);

        // Reset the checkbox to unchecked
        await game.settings.set("lgs-genesys-spell-selector", "showInstructions", false);
    }
});


// Hook into when a chat message is about to be created
Hooks.on("preCreateChatMessage", async (chatMessage, options, userId) => {
  // Check if the chat message contains rolls, and if `addMsg` exists in the first roll
  if (chatMessage.rolls?.[0]?.data?.addMsg && chatMessage.rolls[0].data.addMsg.length > 0) {
    // Replace the flavor with the value of addMsg
    const msg = chatMessage.rolls[0];
    let flavorArray = msg.data.addMsg;
    let newFlavor = flavorArray[0];
    let crit = flavorArray[3] > 0 ? flavorArray[3] : `<span class="dietype genesys triumph">t</span>`;
    let damageMult = parseInt(flavorArray[2]) 
    let isAttackSpell = flavorArray[4];
	let stat = flavorArray[1];
	console.info("stat",stat)
	let spellText = flavorArray[5]
	console.info("flavorArray[6]",flavorArray[6])
	
	if (spellText.length > 0) spellText = spellText + `<hr id="spellTextHR">`;
	// Process the talent UUIDs and create links
	let selectedTalentsWithScaling = JSON.parse(flavorArray[6]);
	let talentList = "";
	let strainTotal = 0;
	let woundTotal = 0;
	if (selectedTalentsWithScaling.length > 0) {
		let talentsArray = await Promise.all(selectedTalentsWithScaling.map(ts => fromUuid(ts.uuid)));
		console.info("talentsArray",talentsArray)
		let talentLinks = talentsArray.map((talent, index) => {
			console.info("talent",talent.system.description)
			if (!talent) return '';
			let itemUuid = talent.uuid;
			let fullItem = talent;
			let scalingNumber = selectedTalentsWithScaling[index].scalingNumber;
			let strainMult = scalingNumber > 0 ? scalingNumber : 1;
			let talentName = talent.name;
			if (scalingNumber !== '') {
				talentName += ' ' + scalingNumber;
			}
			let suffer = countTalentStrain(talent.system.description,strainMult);
			let talentDamage = suffer[0] ? suffer[0] : "";
			let strainDamage = suffer[1] ? suffer[1]: 0;
			let sufferedWounds = suffer[2] ? suffer[2] : 0;
			console.info("selectedTalentsWithScaling",selectedTalentsWithScaling)
			talentName = talentName +talentDamage; // strain and wounds from talent, if any x ranks
			strainTotal += strainDamage; // strain from select ranks * defined strain
			woundTotal += sufferedWounds; // wounds from talents
			return `<a class="" draggable="true" data-link="" data-uuid="${itemUuid}" data-id="${fullItem.id}" data-type="Item" data-tooltip="" data-scope="">${talentName}</a>`;
		}).join(", ");
		talentList = "<b>Applied Talents</b>: " + talentLinks;
		talentList = spellText > "" ? talentList : talentList //+"<hr>";
	}
//+`<hr id="talentListHR">`
    let damage = stat * damageMult;
	console.info("damage",stat,damageMult,stat*damageMult)
    let damageHR = damage > 0 ? `<hr id="damageHR">` : "";
    let hit = 0;
    let spellDesc = `<span style="color: #000475;">${spellText}</span>`;
    let hitmsg = `${spellDesc}<br>`;
	let woundsTaken = woundTotal > 0 ? `&nbsp;&nbsp;&nbsp;<b>Wounds Suffered:</b> ${woundTotal}` : "";
    let genesysStrainOutputx = `<b>Strain Cost:</b> ${strainTotal+2}${woundsTaken}`;
    if (msg.ffg.success > 0) hit = msg.ffg.success;
    if (hit > 0 && isAttackSpell) {
        hitmsg = `
        ${spellDesc}<div style="margin-bottom:9px;"><span style="-webkit-text-stroke: .1px black; font-size:14px; padding-left:5px; padding-right:10px; padding-bottom:10px;" class="item-damage">Damage:</span><span><input style="width:70%; font-size:14px;" class="damage-value" type="text" value="${hit} + ${stat*damageMult} = ${stat*damageMult+hit}" disabled=""></span></div>

        <div id="d1" style="width: 100%; display: flex; padding-bottom:7px;">
          <div id="d2" style="-webkit-text-stroke: .1px black; font-size:14px; padding-left:5px; padding-right:15px; padding-top:5px;">Critical:</div>
          <div id="d3" style="background: rgba(0, 0, 0, 0.05); width: 70%; font-size:14px; padding-right:3px; padding-left:7px; padding-top:3px">${crit}</div>
        </div>${damageHR}${talentList}`
    } else if (hit > 0){
        hitmsg = `<br>${spellDesc}${talentList}`;
    } else {
		hitmsg = `<br><span style="-webkit-text-stroke:.1px black;font-size:14px;padding-left:5px;padding-right:10px;padding-bottom:10px">Missed!</span><hr id="elseHR">${talentList}`
	}
console.info("hitmsg",hitmsg)
	
	
    console.info("newFlavor",newFlavor)
    // remove base damage from output
	//hitmsg = hitmsg.replace("genesysStrainOutput",genesysStrainOutputx)
    newFlavor = newFlavor.replace("replaceMe",hitmsg).replace("genesysStrainOutput",genesysStrainOutputx)

    newFlavor = replaceSpellSymbols(newFlavor)	

    newFlavor = newFlavor.replace(/#dx\d+/g, ''); // remove #dx# from output
	newFlavor = newFlavor.replace(/#cr(\d+)/g, '$1') // replace #cr with crit value
    newFlavor = `<div style="line-height: 1.1; padding-top:3px;">${newFlavor}</div>`
    // Modify the flavor field
    chatMessage.updateSource({ flavor: newFlavor });
    // Clear the addMsg field
    chatMessage.rolls[0].data.addMsg = "";

  }
});

// get strain from Description
function countTalentStrain(desc, ranks) {
	let suffer = [];
    let strainmatch = desc.match(/<p>strain[:=]?\s*(\d+)<\/p>/i);
    let woundmatch = desc.match(/<p>wound[:=]?\s*(\d+)<\/p>/i);
    let strain = strainmatch ? parseInt(strainmatch[1], 10) : 0;
    let wound = woundmatch ? parseInt(woundmatch[1], 10) : 0;
	if(strain > 0) suffer.push(`s:${strain*ranks}`);
	if(wound > 0) suffer.push(`w:${wound*ranks}`);
	let output = ranks > 0 && (strain > 0 || wound > 0) ? [" (" + suffer.join(",") + ")",strain*ranks,wound*ranks] : [];
	console.info("output",output)
	return output;
}

// name of skill from system usnig skill key.
function getSkillName(skillName) {
    const selectedSkillSet = [...game.settings.storage.get("world").entries()]
        .find(([_, value]) => value.key.includes("starwarsffg.skilltheme"))?.[1].value;

    if (!selectedSkillSet) return skillName;

    const skillLists = [...game.settings.storage.get("world").entries()]
        .find(([_, value]) => value.key.includes("starwarsffg.arraySkillList"))?.[1].value;

    if (!skillLists) return skillName;

    const skills = skillLists.find(obj => obj.id === selectedSkillSet)?.skills;

    return skills?.[skillName]?.label || skillName;
}

function getDropdownOptions() {
    // This function populates the dropdown from the csvSkills variable
    let skilltheme = game.settings.storage.get("world").find(entry => entry.key === "starwarsffg.skilltheme")?.value || "starwars";
    let customSettingSkills = game.settings.storage.get("world").find(entry => entry.key === "starwarsffg.arraySkillList");

    let defaultSkillList;
    if (!customSettingSkills) {
        defaultSkillList = game.settings.settings.get("starwarsffg.arraySkillList").default.filter(i => i.id == skilltheme)[0].skills;
    } else {
        defaultSkillList = customSettingSkills.value.filter(i => i.id == skilltheme)[0].skills;
    }

    let keys = Object.keys(defaultSkillList);
    keys.sort();
    csvSkills = keys.join(',');

    // Return an object for dropdown options
    let choices = { "Select Skill": "Select Skill" };
    keys.forEach(skill => {
        choices[skill] = skill;
    });
    return choices;
}

Hooks.on("canvasReady", () => {
    selectedSkill = game.settings.get("lgs-genesys-spell-selector", "magicKnowledgeSkill");
    if (selectedSkill === "Select Skill") {
        ui.notifications.warn("Select Magic knowledge skill for setting.");
    }

    // Attach a right-click event handler to the canvas stage
    canvas.stage.on('rightdown', onRightClick);
});

async function onRightClick(event) {
  if (!event.shiftKey) return;
  const selectedToken = canvas.tokens.controlled[0];
  if (!selectedToken) return;
  const actor = selectedToken.actor;
  if (!actor) return;
  const selectedSkill = game.settings.get("lgs-genesys-spell-selector", "magicKnowledgeSkill");
  if (selectedSkill === "Select Skill") {
    ui.notifications.warn("Select Magic knowledge skill for setting.");
    return;
  }
  const magicActions = game.settings.get("lgs-genesys-spell-selector", "spellSelectorData") || [];
  if (!magicActions.length) {
    ui.notifications.warn("No Magic Actions configured. Use Configure Spell Selector.");
    return;
  }
  createPageDialog(magicActions, actor);
  selectedToken.release();
}

// Get the actor's magic skills (those marked as type Magic and career skills)
function getActorMagicSkills(actor) {
    return Object.keys(actor.system.skills).filter(skillKey => {
        const skill = actor.system.skills[skillKey];
        return skill.type === "Magic" && skill.careerskill;
    });
}

// Create a dialog with buttons for each relevant journal page
function createPageDialog(magicActions, actor) {
  let magicKnow = 0;
  let groups = {};
  
  // Get actor magic skills as defined (assumed to be in the desired format, e.g., "BoundBeyond")
  const actorMagicSkills = getActorMagicSkills(actor);
 
  // Loop through each magic action
  magicActions.forEach((action, index) => {
    // Normalize the CSV skills from the action.
    let actionSkills = action.skills
      .split(',')
      .map(s => s.replace(/[^a-zA-Z]/g, '').trim());
    
    // For each actor magic skill, if it appears in the actionSkills, add the action to that group.
    actorMagicSkills.forEach(skill => {
      if (actionSkills.includes(skill)) {
        if (!groups[skill]) groups[skill] = [];
        groups[skill].push({ action, index });
      }
    });
  });
  
  // If no matching groups were found, warn the user.
  if (Object.keys(groups).length === 0) {
    ui.notifications.warn("No matching Magic Actions found for this actor.");
    return;
  }
  
  // Build content grouped by the matched skill
  let content = "";
  for (let skill in groups) {
    // Use the group header (matched skill) as the header text.
    content += `<h3 style="padding-top:10px">${actor.system.skills[skill].label}</h3>`;
    groups[skill].forEach(item => {
      content += `<button style="width:auto;" data-action-index="${item.index}" data-skill="${skill}">${item.action.name}</button>`;
    });
  }
  
  const dialog = new Dialog({
    title: "Magic Actions",
    content: `<p style="margin-bottom:-5px">Select a magic action:</p>${content}`,
    buttons: { close: { label: "Close" } },
    render: (html) => {
      html.find('button').click(ev => {
        const index = Number(ev.currentTarget.dataset.actionIndex);
        const selectedSkill = ev.currentTarget.dataset.skill;
        // Calculate statRank for the selected skill.
        const ch = actor.system.skills[selectedSkill].characteristic;
        magicSkill = actor.system.skills[selectedSkill]?.label || selectedSkill;
        magicSkillKey = selectedSkill;
        const statRank = actor.system.characteristics[ch].value;
        // Re-calc magicKnow from the setting.
        let magic = game.settings.get("lgs-genesys-spell-selector", "magicKnowledgeSkill");
        magicKnow = Object.values(actor.system.skills).find(s => s.label === magic)?.rank || 0;
        const magicAction = magicActions[index];
        createEffectDialog(null, magicKnow, statRank, 0, actor, "", magicAction);
        dialog.close();
      });
    }
  });
  
  dialog.render(true, { id: "GenesysSpellSelector", width: 600, resizable: true });
}

function groupPagesByMagicSkill(actor, journal) {
  const pagesBySkill = {};
  const skillValues = {};

  // Get the actor's magic skills
  const actorMagicSkills = getActorMagicSkills(actor);

  // Iterate through all journal pages and find relevant ones
  for (let page of journal.pages) {
    const pageContent = page.text.content;
    // Normalize the entire page content to facilitate matching
    const normalizedPageContent = pageContent.replace(/[^A-Za-z0-9]/g, "").toLowerCase();

    // Find skills that match actor's magic skills
    actorMagicSkills.forEach(rawSkill => {
      // Normalize this skill (remove non-alphanumeric, make lowercase)
      const normalizedSkill = rawSkill.replace(/[^A-Za-z0-9]/g, "").toLowerCase();

      // Check if the normalized page content includes the normalized skill
      if (normalizedPageContent.includes(normalizedSkill)) {
        // If we haven't logged a page for this skill yet, initialize an array
        if (!pagesBySkill[rawSkill]) pagesBySkill[rawSkill] = [];

        // Add the current page to this skill's list
        pagesBySkill[rawSkill].push({
          name: page.name,
          content: pageContent
        });

        // Store the skill value and ranks for each skill (if not already stored)
        if (!skillValues[rawSkill]) {
          const skillValue = actor.system.skills[rawSkill]?.rank || 0;
          const stat = actor.system.skills[rawSkill].characteristic;
          statRank = actor.system.characteristics[stat].value;
          const skillRank = actor.system.skills[rawSkill].rank;
          skillValues[rawSkill] = { skillValue, statRank, skillRank };
        }
      }
    });
  }

  return { pagesBySkill, skillValues };
}

// Create spell effects table
async function createEffectDialog(pageContent, skillValue, statRank, skillRank, actor, skillName, magicActionData = null) {
  totalSelected = 0;
  let name, skills, concentration, range, basedifficulty, description;
  let tableRowsHTML = '';
  // We'll store signature data in this variable when generated.
  let signatureData = null;

  if (magicActionData) {
    // Use stored magic action data.
    name = magicActionData.name;
    skills = magicActionData.skills;
    concentration = magicActionData.concentration;
    range = magicActionData.range;
    basedifficulty = magicActionData.difficulty ? parseInt(magicActionData.difficulty, 10) : 1;
    
    description = magicActionData.description.replaceAll("\n\n", "</p><p>")

    // Build row objects from stored effects.
    let rows = [];
    magicActionData.effects.forEach(row => {
      // Only include rows where the "Skill" is "any" or matches magicSkill (case-insensitive).
      if (row.skill.toLowerCase() !== "any" && row.skill.toLowerCase() !== magicSkill.toLowerCase()) return;
      const modValue = parseInt(row.mod) || 0;
      let freeColumn = '';
      let selectColumn = '';
      const repeatableValue = parseInt(row.repeatable) || 0;
      const modRange = Array.from({ length: parseInt(row.repeatable) + 1 }, (_, i) => i);
      if (repeatableValue === 0 || repeatableValue === 1) {
        freeColumn = `<input class="effect-input" type="checkbox" data-selected-value="${modValue}" data-name="${row.settingName}">`;
        selectColumn = `<input class="effect-input" type="checkbox" data-selected-value="${modValue}" data-name="${row.settingName}">`;
      } else if (repeatableValue > 1) {
        freeColumn = `<select class="effect-input" data-selected-value="0">${modRange.map(val => `<option value="${val}">${val}</option>`).join('')}</select>`;
        selectColumn = `<select class="effect-input" data-selected-value="0">${modRange.map(val => `<option value="${val}">${val}</option>`).join('')}</select>`;
      }
      let effectColumnDisplay = `<b>${row.effectName}</b>: ${row.fullDescription}`;
      effectColumnDisplay = effectColumnDisplay.replace(/#dx\d+/g, '<span style="display: none">$&</span>');
      effectColumnDisplay = effectColumnDisplay.replace(/#cr(\d+)/g, '$1<span style="display: none">#cr$1</span>');

      let difficultyColumn = "[di]".repeat(Math.abs(modValue));
      if (modValue > 0) {
        difficultyColumn = "+" + difficultyColumn;
      } else if (modValue < 0) {
        difficultyColumn = "-" + difficultyColumn;
      } else {
        difficultyColumn = "-";
      }
      rows.push({
        freeColumn,
        selectColumn,
        effectColumnDisplay,
        difficultyColumn,
        modValue,
        settingName: row.settingName,
        effectName: row.effectName,
        effects: row.effects
      });
    });
    rows.sort((a, b) => {
      let cmp = a.modValue - b.modValue;
      if (cmp !== 0) return cmp;
      return a.effectName.localeCompare(b.effectName);
    });
    rows.forEach(r => {
      tableRowsHTML += `
        <tr data-effect-name="${r.effectName}" data-effects="${r.effects}">
          <td style="padding: 0px 6px;">${r.freeColumn}</td>
          <td style="padding: 0px 6px;">${r.selectColumn}</td>
          <td style="padding: 0px 6px;">${r.effectColumnDisplay}</td>
          <td style="padding: 0px 6px; text-align:center;">${r.difficultyColumn}</td>
        </tr>
      `;
    });
  }
  // Compute currentTotal (no signature-based reduction yet)
  let currentTotal = totalSelected;
  let difficulties = applyUpgrades(basedifficulty + currentTotal, actor);
  let upgrades = difficulties[0];
  
  attackspell = magicActionData && magicActionData.damage ? true : false;

  let dialogContent = `
  <style>
  
@keyframes fadeToBlack {
    0% { color: darkred; }
    12.5% { color: black; }
    25% { color: darkred; }
    37.5% { color: black; }
    50% { color: darkred; }
    62.5% { color: black; }
    75% { color: darkred; }
    87.5% { color: black; }
    100% { color: darkred; }
}

#EffectSelectionDialog .fading-text {
    color: darkred;
    animation: fadeToBlack 12s linear forwards;
}
  </style>
  
    <p style="display: flex; justify-content: space-between; align-items: center;">
      <span><b>Name:</b> <span id="name">${name}</span></span>
      <button type="button" 
              style="width: 29px; margin-left: auto;" 
              id="generateSignature" 
              title="Generate Signature Spell from selections">+</button>
    </p>
    <p><b>Skills:</b> <span id="skill">${skills}</span></p>
    <p><b>Range:</b> <span id="range">${range}</span></p>
    <p><b>Concentration:</b> <span id="concentration">${concentration}</span></p>
    <p id="description">${description}</p>
    <p style="text-align:center; font-size:20px;" id="difficulty" data-basedifficulty="${basedifficulty}">
      <b>Difficulty:</b> ${replaceSpellSymbols(upgrades)}
    </p>
	<p class="fading-text"><b>Available Effects:</b> The following is a list of suggested effects and not a definitive list. If you want to do something in line with the Magic Action, work out the details and difficulty with your GM.</p>
    <figure class="table">
      <table border="1">
        <thead>
          <tr>
            <th>Free</th>
            <th>Select</th>
            <th>Effect</th>
            <th>Difficulty</th>
          </tr>
        </thead>
        <tbody>${tableRowsHTML}</tbody>
      </table>
    </figure>
    <p>
      <textarea id="spellDescription" rows="3" style="width: 100%; overflow-y: scroll;" placeholder="Describe spell appearance"></textarea>
    </p>
  `;
  dialogContent = replaceSpellSymbols(dialogContent).replaceAll("#k", skillValue);

  // (Talent-related code remains unchanged.)
  let selectedTalents = actor.getFlag('lgs-genesys-spell-selector', 'selectedTalents') || [];
  if (!Array.isArray(selectedTalents)) {
    selectedTalents = selectedTalents.split(',').filter(s => s);
  }
  let talentsCheckboxes = '';
  let talentsRadioButtons = '';
  if (selectedTalents.length > 0) {
    let talentsArray = await Promise.all(selectedTalents.map(entry => {
      let [uuid, scalingFlag] = entry.split(',');
      return fromUuid(uuid);
    }));
    let storyTalents = [];
    let otherTalents = [];
    talentsArray.forEach((talent, index) => {
      if (!talent) return;
      let [uuid, scalingFlag] = selectedTalents[index].split(',');
      if (talent.system.description && talent.system.description.toLowerCase().includes("story point")) {
        storyTalents.push({ talent, uuid, scalingFlag });
      } else {
        otherTalents.push({ talent, uuid, scalingFlag });
      }
    });
    if (storyTalents.length > 0) {
      talentsRadioButtons = storyTalents.map(({ talent, uuid, scalingFlag }) => {
        let scalingHTML = '';
        if (scalingFlag === 'true') {
          scalingHTML = `<select name="talent-scaling-${talent.uuid}" style="margin-left: 5px;">
              <option value=""></option>
              ${[...Array(11).keys()].map(i => `<option value="${i}">${i}</option>`).join('')}
            </select>`;
        }
        return `<label style="margin-right: 5px; display: flex; align-items: center;">
            <input type="radio" name="talent-story" value="${talent.uuid}">
            <a class="content-link" data-link="" draggable="false" data-uuid="${talent.uuid}" data-id="${talent.id}" data-type="Item">${talent.name}</a>
            ${scalingHTML}
          </label>`;
      }).join('');
    }
    let noneOption = `<label style="margin-right: 5px; display: flex; align-items: center;">
            <input type="radio" name="talent-story" value="">
            None
          </label>`;
    talentsRadioButtons = noneOption + talentsRadioButtons;
    if (otherTalents.length > 0) {
      talentsCheckboxes = otherTalents.map(({ talent, uuid, scalingFlag }) => {
        let scalingHTML = '';
        if (scalingFlag === 'true') {
          scalingHTML = `<select name="talent-scaling-${talent.uuid}" style="margin-left: 5px;">
              <option value=""></option>
              ${[...Array(11).keys()].map(i => `<option value="${i}">${i}</option>`).join('')}
            </select>`;
        }
        return `<label style="margin-right: 5px; display: flex; align-items: center;">
            <input type="checkbox" name="talent" value="${talent.uuid}">
            <a class="content-link" data-link="" draggable="false" data-uuid="${talent.uuid}" data-id="${talent.id}" data-type="Item">${talent.name}</a>
            ${scalingHTML}
          </label>`;
      }).join('');
    }
  }
  
  if (selectedTalents.length > 0 && (talentsRadioButtons || talentsCheckboxes)) {
    let relatedTalentText = `
      <h3>Spell Related Talents</h3>
      <details>
        <summary>Talent Dropdown Help</summary>
        Select talents to indicate which ones are applied to the spell.
      </details>
      <div style="display: flex; flex-wrap: wrap; gap: 0px;">
        ${talentsRadioButtons}
        ${talentsCheckboxes}
      </div>`;
    dialogContent += replaceSpellSymbols(relatedTalentText);
  }
  
  let magicimplements = getActorImplements(actor);
  if (magicimplements > "") {
    dialogContent += `<h3>Implements</h3>
	  ${magicimplements}`;
  }

  new Dialog({
    title: "Effect Selection",
    content: dialogContent,
    buttons: {
      finalize: {
        label: "Finalize Roll",
        callback: async () => {
          const dialogElement = document.getElementById('EffectSelectionDialog');
          let group = $(dialogElement).find('input[type="checkbox"]').filter(function() {
            let txt = $(this).parent().text().trim().toLowerCase();
            return txt.includes("signature spell");
          });
          // If all checkboxes in the group are checked, reduce totalSelected by group size.
          let reduction = group.length;
          group.each(function() {
            if (!$(this).is(':checked')) { reduction = 0; }
          });
          if (reduction > 0) totalSelected -= reduction;

          let criticalstring = "";
          let damageString = "";
          const selectedEffects = [];
          document.querySelectorAll('tbody tr').forEach(row => {
            const freeCheckbox = row.querySelector('td:nth-child(1) input[type="checkbox"]');
            const selectCheckbox = row.querySelector('td:nth-child(2) input[type="checkbox"]');
            const dropdown = row.querySelector('td:nth-child(2) select');
            const freeDropdown = row.querySelector('td:nth-child(1) select');
            const effectName = row.dataset.effectName || "";
            const effectsVal = row.dataset.effects || "";
            const dropdownValue = dropdown ? parseInt(dropdown.value, 10) : 0;
            const freeDropdownValue = freeDropdown ? parseInt(freeDropdown.value, 10) : 0;
            const dropdownLevels = (freeDropdownValue + dropdownValue) > 0
              ? "+" + (freeDropdownValue + dropdownValue) + " "
              : "";
            const effectText = dropdownLevels + `<b>${effectName}</b>: ${effectsVal}`;
            if (
              (freeCheckbox && freeCheckbox.checked) ||
              (selectCheckbox && selectCheckbox.checked) ||
              ((dropdownValue + freeDropdownValue) > 0)
            ) {
              selectedEffects.push(effectText);
            }
          });
		  
          let output = selectedEffects.join('<br>');
          const stat = actor.system.skills[magicSkillKey].characteristic;
          const characteristic = actor.system.characteristics[stat];
          const skill = actor.system.skills[magicSkillKey];
          const abi = (characteristic.value == skill.rank) ? 0 : Math.abs(characteristic.value - skill.rank);
          let difficulties = applyUpgrades(totalSelected + basedifficulty, actor);
          let baseDif = replaceSpellSymbols(difficulties[0]);
          let outputUpgradeObj = difficulties[1];
          let dicePool = new DicePoolFFG({
            ability: abi,
            proficiency: Math.min(characteristic.value, skill.rank),
            boost: skill.boost || 0,
            setback: outputUpgradeObj.setback || 0,
            difficulty: outputUpgradeObj.difficulty,
            challenge: outputUpgradeObj.challenge,
            success: 0,
            advantage: 0,
            triumph: 0,
            despair: 0
          });
		  if (selectedEffects.length > 0) output = `<br id="priorSelectedHR">` + output + `<hr id="selectedEffectHR">`;
		  
          let Msg = `<i>Rolling ${magicSkill}</i><br>
<div style="background: #d8cbc0; padding-top:10px;">
<div style="background: #eeeeee; border: 1px solid; padding: 10px;">
  <h2 style="font-size:25px; border-bottom: 1px solid; padding-bottom: 1px; margin-bottom: 0px;">Spell (${name})</h2>
  replaceMe
  ${output}
  
  genesysStrainOutput<br>
  <b>Base Range:</b> ${range}<br>
  <b>Base Difficulty:</b> ${baseDif}<br>
</div>
</div>
<span style="display: none;">dam:${statRank}</span>`;

          let damageMatch = Msg.match(/#dx(\d+)/);
          let damageMult = damageMatch ? damageMatch[1] : 1;
          let critMatch = output.match(/#cr(\d+)/);
          let critValue = critMatch ? critMatch[1] : 0;
          const spellDescription = document.getElementById('spellDescription').value;
          let selectedTalentsWithScaling = [];
          document.querySelectorAll('#EffectSelectionDialog input[name="talent"]:checked').forEach(cb => {
            let uuid = cb.value;
            let scalingDropdown = cb.parentElement.querySelector(`select[name="talent-scaling-${uuid}"]`);
			
            let scalingNumber = scalingDropdown ? scalingDropdown.value : '';
			console.info("get cb",cb)
            selectedTalentsWithScaling.push({ uuid, scalingNumber });
          });
          document.querySelectorAll('#EffectSelectionDialog input[name="talent-story"]:checked').forEach(cb => {
            let uuid = cb.value;
            let scalingDropdown = cb.parentElement.querySelector(`select[name="talent-scaling-${uuid}"]`);
            let scalingNumber = scalingDropdown ? scalingDropdown.value : '';
            selectedTalentsWithScaling.push({ uuid, scalingNumber });
          });
          let addMsg = [Msg, statRank, parseInt(damageMult), parseInt(critValue), attackspell, spellDescription, JSON.stringify(selectedTalentsWithScaling)];
          let b = await new game.ffg.RollBuilderFFG(actor, dicePool, `Rolling ${magicSkill} skill`, skill.label,
            { addMsg }, "", "diceRollSound").render(true);
        }
      }
    },
    render: html => {
      // NEW: Immediately on render, check the actor's "Signature Spell" item.
      html.ready(function() {
        let sigItem = actor.items.find(i => i.name.toLowerCase() === "signature spell");
        let validSignature = false;
        let match;
        if (sigItem) {
          let desc = sigItem.system.description || "";
          match = desc.match(/\[signatureSpell\]([\s\S]*?)\[\/signatureSpell\]/);
          if (match) {
            try {
              let data = JSON.parse(match[1]);
              let currentSpellName = html.find('#name').text().trim().toLowerCase();
              if (data.name && data.name.toLowerCase() === currentSpellName) {
                validSignature = true;
              }
            } catch (e) {}
          }
        }
        if (!validSignature) {
          let sigGroup = html.find('input[type="checkbox"]').filter(function() {
            let txt = $(this).parent().text().trim().toLowerCase();
            return txt.includes("signature spell");
          });
          sigGroup.prop('disabled', true);
          let implHeader = html.find("h3:contains('Implements')");
          if (match && implHeader.length && html.find("#signature-invalid-message").length === 0) {
            implHeader.before(`<p id="signature-invalid-message" style="margin-top:-3px; font-style: italic; color: darkred; font-size: 10pt;">Signature spell not valid for this Action</p>`);
          }
        }
      });
      // Modified event handler for the "Generate Signature" button.
      html.find('#generateSignature').click(function() {
        let spellDescriptionVal = html.find('#spellDescription').val().trim();
        if (spellDescriptionVal.length < 10) {
          new Dialog({
            title: "Error",
            content: "Spell Description is insufficent length",
            buttons: { ok: { label: "OK" } }
          }).render(true);
          return;
        }
        let rowsData = [];
        html.find('tbody tr').each(function(index, row) {
          let $row = $(row);
          let freeInput = $row.find('td:nth-child(1) input, td:nth-child(1) select');
          let selectInput = $row.find('td:nth-child(2) input, td:nth-child(2) select');
          let freeVal = freeInput.is('input[type="checkbox"]') ? freeInput.is(':checked') : freeInput.val();
          let selectVal = selectInput.is('input[type="checkbox"]') ? selectInput.is(':checked') : selectInput.val();
          rowsData.push({ row: index, free: freeVal, select: selectVal });
        });
        let spellName = html.find('#name').text().trim();
        signatureData = { name: spellName, rows: rowsData, spellDescription: spellDescriptionVal };
        let signatureText = "[signatureSpell]" + JSON.stringify(signatureData) + "[/signatureSpell]";
        new Dialog({
          title: "Signature Spell Data",
          content: `<b>Usage:</b><br>1) Select desired effects in the spell select.<br>2) Paste the data below into the <i>Signature Spell</i> description on character. <textarea style="width:100%; height:300px;">${signatureText}</textarea>`,
          buttons: { ok: { label: "OK" } }
        }).render(true);
      });
      // Modified event handler for changes on any checkbox with a label containing "signature spell"
      html.find('input[type="checkbox"]').filter(function() {
        let txt = $(this).parent().text().trim().toLowerCase();
        return txt.includes("signature spell");
      }).change(function() {
        let group = html.find('input[type="checkbox"]').filter(function() {
          let txt = $(this).parent().text().trim().toLowerCase();
          return txt.includes("signature spell");
        });
        if ($(this).is(':checked')) {
          // When checked, set all to checked and disable #spellDescription.
          group.prop('checked', true);
          html.find('#spellDescription').prop('disabled', true);
          // Load signature data from the actor's "Signature Spell" item.
          let sigItem = actor.items.find(i => i.name.toLowerCase() === "signature spell");
          if (sigItem) {
            let desc = sigItem.system.description || "";
            let match = desc.match(/\[signatureSpell\]([\s\S]*?)\[\/signatureSpell\]/);
            if (match) {
              try {
                let data = JSON.parse(match[1]);
                let currentSpellName = html.find('#name').text().trim().toLowerCase();
                if (data.name && data.name.toLowerCase() === currentSpellName) {
                  data.rows.forEach(rowData => {
                    let $row = html.find(`tbody tr:eq(${rowData.row})`);
                    if ($row.length) {
                      let freeInput = $row.find('td:nth-child(1) input, td:nth-child(1) select');
                      let selectInput = $row.find('td:nth-child(2) input, td:nth-child(2) select');
                      if (freeInput.is('input[type="checkbox"]')) {
                        freeInput.prop('checked', rowData.free);
                      } else {
                        freeInput.val(rowData.free);
                      }
                      if (selectInput.is('input[type="checkbox"]')) {
                        selectInput.prop('checked', rowData.select);
                      } else {
                        selectInput.val(rowData.select);
                      }
                    }
                  });
                  // If stored signature data includes a spell description, populate the field.
                  if (data.spellDescription) {
                    html.find('#spellDescription').val(data.spellDescription);
                  }
                  // Now compute totalSelected from the select column.
                  let sum = 0;
                  html.find('tbody tr').each(function() {
                    let $row = $(this);
                    let selectInput = $row.find('td:nth-child(2) input, td:nth-child(2) select');
                    if (selectInput.length) {
                      if (selectInput.is('input[type="checkbox"]')) {
                        if (selectInput.is(':checked')) {
                          let val = parseInt(selectInput.attr('data-selected-value')) || 0;
                          sum += val;
                        }
                      } else if (selectInput.is('select')) {
                        let val = parseInt(selectInput.val()) || 0;
                        sum += val;
                      }
                    }
                  });
                  totalSelected = sum;
                  // Disable all inputs in the table.
                  html.find('tbody tr input, tbody tr select').prop('disabled', true);
                  let reduction = group.length > 1 ? 2 : 1;
                  let computedTotal = totalSelected - reduction;
                  let newDiff = applyUpgrades(basedifficulty + computedTotal, actor)[0];
                  html.find('#difficulty').html(`<b>Difficulty:</b> ${replaceSpellSymbols(newDiff)}`);
                }
              } catch (e) {
                ui.notifications.error("Error parsing signature data.");
              }
            }
          }
        } else {
          // When unchecked, clear the checkbox group, clear table selections, re-enable and clear #spellDescription.
          group.prop('checked', false);
          html.find('tbody tr input[type="checkbox"]').prop('checked', false);
          html.find('tbody tr select').val("0");
          totalSelected = 0;
          html.find('tbody tr input, tbody tr select').prop('disabled', false);
          html.find('#spellDescription').val('').prop('disabled', false);
          let newDiff = applyUpgrades(basedifficulty + totalSelected, actor)[0];
          html.find('#difficulty').html(`<b>Difficulty:</b> ${replaceSpellSymbols(newDiff)}`);
        }
      });
      html.find('.talent-link').click(ev => {
        ev.preventDefault();
        const itemId = ev.currentTarget.dataset.itemId;
        const item = actor.items.get(itemId);
        if (item) {
          item.sheet.render(true);
        }
      });
      
      // NEW: Attach a change event listener to all inputs with class "effect-input" (removing reliance on inline handlers)
      html.find('.effect-input').on('change', function() {
        updateDifficultyHandler(basedifficulty, actor.id, html);
      });
      
      // Local updateDifficultyHandler function (no global exposure)
      function updateDifficultyHandler(basedifficulty, actorId, html) {
        let actorRef = game.actors.get(actorId);
        if (!actorRef) return;
        totalSelected = 0; // Reset totalSelected when calculating difficulty
        html.find('tbody tr').each(function() {
          let $row = $(this);
          let selectCheckbox = $row.find('td:nth-child(2) input[type="checkbox"]');
          let dropdown = $row.find('td:nth-child(2) select');
          if (selectCheckbox.length && selectCheckbox.prop('checked')) {
            totalSelected += Number(selectCheckbox.data('selected-value'));
          } else if (dropdown.length && Number(dropdown.val()) > 0) {
            totalSelected += Number(dropdown.val());
          }
        });
        let upgrades = applyUpgrades(basedifficulty + totalSelected, actorRef)[0];
        upgrades = replaceSpellSymbols(upgrades);
        html.find('#difficulty').html(`<b>Difficulty:</b> ${upgrades}`);
      }
    }
  }).render(true, { id: "EffectSelectionDialog", width: 800, resizable: false });
}

// get implements on actor that have <p>implement</p> in item description
function getActorImplements(actor) {
  // Filter the actor's items that have a description containing "<p>implement</p>" (case-insensitive)
  const magicimplements = actor.items.filter(item => {
    const description = item.system.description || "";
    return /<p>implement<\/p>/i.test(description);
  });

  // Map over the filtered items to create a string of radio buttons with linked item names
  let output = magicimplements.map(implement => {
    return `<label style="margin-right: 5px; display: flex; align-items: center;"></label>
              <input type="radio" name="implement" value="${implement.uuid}">
              <a class="content-link" data-link="" draggable="false" data-uuid="${implement.uuid}" data-id="${implement.id}" data-type="Item">
                ${implement.name}
              </a>
            `;
  }).join('');

  let noneOption = `<label style="margin-right: 5px; display: flex; align-items: center;">
                <input type="radio" checked name="implement" value="">
				none
			  </label>
            `

  output = `<div style="display:flex">${noneOption}${output}</div>`;

  return output;
}

// Update difficulty based on the selected values in the "Select" column
function updateDifficulty(basedifficulty, actorId) {
    // We need to retrieve the actor from the passed actorId
    let actor = game.actors.get(actorId);
    if (!actor) return;

    totalSelected = 0; // Reset totalSelected when calculating difficulty

    // Only consider inputs from the "Select" column
    document.querySelectorAll('tbody tr').forEach(row => {
        const selectCheckbox = row.querySelector('td:nth-child(2) input[type="checkbox"]');
        const dropdown = row.querySelector('td:nth-child(2) select');

        // Add values from the "Select" column only
        if (selectCheckbox && selectCheckbox.checked) {
            totalSelected += Number(selectCheckbox.getAttribute('data-selected-value'));
        } else if (dropdown && Number(dropdown.value) > 0) {
            totalSelected += Number(dropdown.value);
        }
    });

    // Now apply upgrades (castingPenalty) on top of (basedifficulty + totalSelected)
    let upgrades = applyUpgrades(basedifficulty + totalSelected, actor)[0];
	upgrades = replaceSpellSymbols(upgrades)
    document.getElementById('difficulty').innerHTML = `<b>Difficulty:</b> ${upgrades}`;
}

function replaceSpellSymbols(string) {

  let output = string.split(/(<[^>]+>)/g).map(part => {
    // If this segment is an HTML tag (or part of one), leave it unchanged.
    if (part.startsWith("<")) return part;
    // Otherwise, perform the replacements on plain text.
    return part
      .replaceAll("[th]", `<span class="dietype genesys threat">h</span>`)
      .replaceAll("[tr]", `<span class="dietype genesys triumph">t</span>`)
      .replaceAll("[ad]", `<span class="dietype genesys advantage">a</span>`)
      .replaceAll("[fa]", `<span class="dietype genesys failure">f</span>`)
      .replaceAll("[ab]", `<span class="dietype genesys ability">f</span>`)
      .replaceAll("[su]", `<span class="dietype genesys success">s</span>`)
      .replaceAll("[de]", `<span class="dietype genesys success">d</span>`)
      .replaceAll("[se]", `<span class="dietype starwars setback">b</span>`)
      .replaceAll("[bo]", `<span class="dietype starwars boost">b</span>`)
      .replaceAll("[ch]", `<span class="dietype starwars challenge">c</span>`)
      .replaceAll("[di]", `<span class="dietype starwars difficulty">d</span>`)
      .replaceAll("[pr]", `<span class="dietype starwars proficiency">c</span>`)
      .replaceAll("[threat]", `<span class="dietype genesys threat">h</span>`)
      .replaceAll("[triumph]", `<span class="dietype genesys triumph">t</span>`)
      .replaceAll("[advantage]", `<span class="dietype genesys advantage">a</span>`)
      .replaceAll("[failure]", `<span class="dietype genesys failure">f</span>`)
      .replaceAll("[success]", `<span class="dietype genesys success">s</span>`)
      .replaceAll("[despair]", `<span class="dietype genesys success">d</span>`)
      .replaceAll("[setback]", `<span class="dietype starwars setback">b</span>`)
      .replaceAll("[boost]", `<span class="dietype starwars boost">b</span>`)
      .replaceAll("[challenge]", `<span class="dietype starwars challenge">c</span>`)
      .replaceAll("[difficulty]", `<span class="dietype starwars difficulty">d</span>`)
      .replaceAll("[proficiency]", `<span class="dietype starwars proficiency">c</span>`);
  }).join('');

  return output;
}

/*
function convertEntitiesToBrackets(text) {
  if (typeof text !== "string") return text;
  return text.replace(/&#91;/g, "[").replace(/&#93;/g, "]");
}
*/

function applyUpgrades(difficulty, actor) {
  // This function retrieves the castingPenalty flag (e.g. "2S", "3U", etc.) from the actor
  // and applies it to the passed-in base difficulty ("[di]" dice).
  //  - "#S" means add that many "[se]" (setbacks).
  //  - "#U" means upgrade that many "[di]" to "[ch]" (challenge), or if insufficient "[di]",
  //    add a "[di]" then apply the upgrade logic.
  // Returns an array of two elements:
  //   [0] => string representing the final dice, e.g. "[ch][ch][di][se]"
  //   [1] => object with numeric tallies of {challenge, difficulty, setback}

  let castingPenalty = actor?.getFlag("lgs-genesys-spell-selector", "castingPenalty") || "";
  
  // Start with the base difficulty as difficultyCount
  let difficultyCount = difficulty;
  let challengeCount = 0;
  let setbackCount = 0;

  // If we have no penalty, just return the base dice
  if (!castingPenalty) {
    let baseString = "[di]".repeat(difficultyCount);
    return [
      baseString,
      {
        challenge: challengeCount,
        difficulty: difficultyCount,
        setback: setbackCount
      }
    ];
  }

  // If penalty ends with 'S', parse how many setbacks to add
  if (castingPenalty.endsWith("S")) {
    const numSetbacks = parseInt(castingPenalty) || 0;
    setbackCount += numSetbacks;
  }

  // If penalty ends with 'U', parse how many upgrades to apply
  if (castingPenalty.endsWith("U")) {
    let numUpgrades = parseInt(castingPenalty) || 0;

    // Perform the upgrades:
    // - First consume existing [di], upgrading each one to [ch] (challenge) until we run out of [di] or upgrades
    // - If we still have upgrades left but no more [di], we "add" a [di] (costs 1 upgrade to place it),
    //   and if there's still an upgrade left, upgrade that newly placed [di] to [ch], and so on, following
    //   the example logic from the prompt.
    while (numUpgrades > 0) {
      if (difficultyCount > 0) {
        // We have [di] to upgrade
        difficultyCount--;
        challengeCount++;
        numUpgrades--;
      } else {
        // No [di] left to upgrade, so we add a [di] (costs 1 upgrade to place it)
        difficultyCount++;
        numUpgrades--;
        // If there's still an upgrade left, upgrade that newly added [di] to [ch]
        if (numUpgrades > 0) {
          difficultyCount--;
          challengeCount++;
          numUpgrades--;
        }
      }
    }
  }

  // Build the final dice string
  let finalString = "[ch]".repeat(challengeCount) + "[di]".repeat(difficultyCount) + "[se]".repeat(setbackCount);

  // Also build the object portion
  let finalObject = {
    challenge: challengeCount,
    difficulty: difficultyCount,
    setback: setbackCount
  };
  return [finalString, finalObject];
}

async function resetSpellTableColumns() {
    const journal = game.journal.getName("Magic Effect List");
    if (!journal) {
        ui.notifications.error("Magic Effect List journal not found.");
        return;
    }
    // Loop through every page in the journal.
    for (let page of journal.pages) {
        let content = page.text.content;
        // Remove any inline style rules for width or height in <tr> and <td> elements.
        content = content.replace(/(<(tr|td)[^>]*style=")([^"]*)(")/gi, (match, p1, p2, p3, p4) => {
            let newStyle = p3.replace(/(?:^|\s)(width|height)\s*:\s*[^;]+;?/gi, '');
            return p1 + newStyle.trim() + p4;
        });
        // Also remove any width="..." or height="..." attributes on <tr> and <td>
        content = content.replace(/<(tr|td)([^>]*)(\s+(width|height)\s*=\s*["'][^"']*["'])([^>]*)>/gi, '<$1$2$5>');
        await page.update({ "text.content": content });
    }
    ui.notifications.info("Reset Spell Table Columns completed.");
}

// Convert literal square brackets to HTML entities
function convertBracketsToEntities(str) {
  if (typeof str !== "string") return str;
  str = str.replace(/\[/g, "&#91;");
  str = str.replace(/\]/g, "&#93;");
  str = str.replace(/\=/g, "&#61;");
  return str
}

// Convert HTML entities back to literal square brackets
function convertEntitiesToBrackets(str) {
  if (typeof str !== "string") return str;
  str = str.replace(/&#91;/g, "[");
  str = str.replace(/&#93;/g, "]");
  str = str.replace(/&#61;/g, "=");
  return str
}

// New helper function to sanitize text:
// Replaces any single ASCII newline (LF or CR) with a space,
// unless that newline is immediately preceded or followed by another newline.
function sanitizeText(text) {
  if (typeof text !== "string") return text;
  // This regex finds newline characters not immediately adjacent to another newline.
  return text.replace(/(?<!\n)[\r\n](?!\n)/g, " ");
}