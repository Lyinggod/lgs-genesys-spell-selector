# Lyinggod's Spell Selector for Genesys TTRPG

${{\color{Darkred}\Large{\textsf{This\ module\ is\ still\ under\ development\ and\ may\ have\ errors\ \}}}}\$

**The instructions are likely outpacing the releases**

This module allows the "on the fly" creation of spells from the token in accordance with the Genesys magic rules, selecting applicable talents, and implements, and output all results to chat, including base strain.

The spell selector is activated by SHIFT+RIGHT CLICK on the token. This will only be available to actors that have at least one rank 1 in a magic skill.

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/spell_selector_example.gif" width=500>

## Magic Knowledge and Configuring Magic Actions

In Configure Settings, Configure _Magic Knowledge Skill_ via the dropdown. This applies ranks of knowledge to the appropriate effects.

Add actions and effects via the _Configure Spell Selector_ button

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/config_options.jpg" width=500>

## Adding Actions and Effects

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/configure_spell_selector.jpg" width=500>

### Save

This is the most important button. Clicking _Save_ will store your entries. Closing the _Configure Spell Selector_ dialog will without saving will lose any changes.

**Add Magic Action:**

Creates a new magic action. After creating the Magic Action, fill in the fields.

### Damage Dealing Attacks

Check the _Attack?_ checkbox to indicate that this is a damage dealing spell such as _Attack_. This will send the damage results to the chat output.

### Skill Names

Skill names are a comma separated list and must be exactly the same as on the character.

### Description

The description may have HTML but should not be wrapped in &lt;p&gt;&lt;/p&gt; other extra spacing will occur.

Add a blank line between paragraphs to create a new paragraph in the _Spell Selector_. Additionally, normal FFG Star Wars system dice and symbol codes may be used in all descriptions, such as [di].

**Note:** When the actions are saved, any line breaks in any descriptions will be replaced with spaces.

## Adding Effects

Click _Add Effects_ to add additional effects

**Effect Name**: The name of the effect

**Skill:** If the effect is limited to a specific skill, such as Arcana, enter the name here other enter "any". The skill name must exactly match the skill name on the character sheet.

**Difficulty:** The base difficulty of the effect

**Levels:** 

This determines how the selection option appears on the user's effect selector sheet.

1 = Creates a checkbox

2+ = Creates a dropdown with options ranging from 0 through the value selected.

**Full Description:** The description as it appears on the _Spell Selector_ dialog.

**Short Description:** An abreviated description show in the chat when the spell is rolled.

## Description Codes

THe following codes may be added to the _Effect_ descriptions and will have specific effects if the relevant effect is selected.

#k = This will show the rank of selected _magic Knowledge_ skill. Example: "Gets #k ranks" will display as "Gets 3 ranks" if the magic knowledge skill = 3.

#dx? - "?" is a number that sets the damage multipler of the base damage. Example: "#dx2" will multiply the base attribute damage by 2. This will not have a visible affect on the description within the _Spell Selector_ dialog.

#cr? - "?" is a number that sets the Critical rating. Example: "#cr3" would set the Critical rating of the spell to 3.

**Important:** #dx? and #cr? must be placed in the _Short Description_ field affect the chat output.  

## Import and Exporting Actions and Effects

This can be used to copy stored Magic Actions between systems.

**Export Actions:** This will export the stored Magic Actions and effects to the computer clipboard. The save data is in a json format and may be saved to a text file.

**Import Actions:** This will open a box that the previously exported data can be pasted into.

## Adding Talents to Spells

Talents that affect the casting or caster may selected within the spell Spell Selector by adding applicable talents to the actor via the title bar. 

An expanable help section is provided to the user with avaiable options.

If a talent is ranked, it will have "r:#" in the name of the talent.

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/spell_talent_selector.jpg" width=500>

To add a spell, select the **3 bars** from the actors title header. Add talents by pressing the "**+**" button. 

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/talent_selector.jpg" width=400>

**Scaling:** This indicates that the talent allows the user to spend something to get something based on ranks in something such as _may spend 1 strain to get 1 advantage per rank in this talent_.

Note: The FFG Star Wars systems stores ranked talents individually on the actor. As an example "Grit" as rank 4 is stored as 4 separate talents. This means that a switch is stored in the selected talent. Some switches can be defined before being placed on the actor. Others are defined at the time of purchase. This is significant because if a talent is removed from the above dialog and then added back in, different version of the talent may be added, requiring some switched to be re-applied to the talent.

# Switches

A switch is a line of text that is added to an items description. 

The following switches are avaiable.

Wounds and strain inflicted from talent can be shown in the chat message.  To have these values displayed per talent and in total add either of the following on their own line within the talents description on the actor:

**Talent Switches**
- **wound: #** - # is the number of wounds inflicted times the rank multipler. This appear in chat for each applicable talent as "(w:#)" and in total wounds taken
- **strain: #** - # is the number of strain inflicted times the rank multipler. This appear in chat for each applicable talent as "(s:#)" and in total train taken
- **free: #** - # is a comma separated list of effects. Effect is automatically selected in the "Free" column or the dropdown is set to 1. This can be toggle off.
- **force: #** - # is a comma separted list of effects that will alway be applied under the "Free" column and cannot be unchecked. The talent with this is automatically checked.
- **never: #** - # is a comma separted list of effects that will never be allowed. The talent checkbox with this is automatically checked and cannot be unchecked. Checkboxes and dropdowns for this effect are disabled.
- **difficulty: #** - This reduces the difficulty when the talent is selected. The note of the reduction is shown after the talent name in chat.
- **note: #** - # is a string. This appears below the effects and meant to be a reminder to the caster of somthing regarding the talent

**Implement Switches**

Implement switches are placed in the description of an item.

- **implement** - Assigns the item to the spell selector.
- **extraSuccessAfterHit: #** - May be positive or negative. Modifies the damage of a successful attack. Non-attack spells just show only bonus from implement (see spell block example)

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/harsh_talent.jpg" width=300> <img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/spell-block.jpg">

If the talent is stored on the actor as _Scaling_ then these values are multiplied by the number of levels selected by the user.

**Note**: These are provided for informational purposes and are not automatically applied to an actor.

## Talents with Story Points

Only one talent may be selected that contains the text "story point". If the actor has talent that modifies the normal story point restriction, this will need to be applied manually after the roll.

## Signature Spell Talent

The spell selector will apply the benefits of the Signature Spell talent if configured as follows:

After selecting the desired spell effect, the "**+**" on the spell selector will display a dialog with the signature talent data. Paste this into the _Signature Spell_ talent's description, at the bottom.

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/storing_spell_signature.jpg" width=400>

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/signature_spell_data.jpg" width=400>

This must be pasted into the talents description. This may be wrapped in a _Secret_ block to hide it.

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/signature_spell_data_in_talent.jpg" width=400>

Selecting _Signature Spell_ talent in the _Spell Selector_ will assign the saved values to the selector and provide the -1 difficulty reduction. If the actor has _Signature Spell (Improved)_, -2 difficulty will be applied.

**Note:** The Signature Spell talent will only be avaiable if the correct magic action is applied and the selection data has been stored in talents description.

## Implements

Implements that are applied to a particular spell may also be selected from the spell selector.

To define an item as an implement, add "implement" on a line by itself in the description of the item. An implement has no effect except to show in the chat which implement was used. Any benefits the implement bestows should be applied manually, after the roll.

# Spell Selector

**Free Column**: If a something grants a free effect, select the effect in this column.

**Select Column:** This column determines the total difficulty of the spell based on selected effects.

**Describe Spell Appearance** - this is optional and may be used to provide a narrative description of how the spell manifest: ie _a swarm of angry butterflies_.

**Spell Related Talents:** The talents that are being applied to this particular casting.

**Implements:** The implement being used for this casting. The implement does not have an effect on the roll or chat result beyond noting is usage.

# Chat Output

<img src="https://github.com/Lyinggod/lgs-genesys-spell-selector/blob/main/docs/chat_output.jpg" width=400>

In this example, that shows the following
- it shows strain and wounds from the talent _Harsh Talent_
- The talents applied
- Total Strain and wounds from all talents
- Base Range
- Base difficuly before the player manually reduced it due to talents or other reason
  

