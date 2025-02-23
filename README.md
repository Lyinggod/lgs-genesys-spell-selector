# Lyinggod's Spell Selector for Genesys TTRPG

${{\color{Darkred}\Large{\textsf{This\ module\ is\ still\ under\ development\ and\ may\ have\ errors\ \}}}}\$

This module allows the "on the fly" creation of spells from the token in accordance with the Genesys magic rules, selecting applicable talents, and implements, and output all results to chat, including base strain.

The spell selector is activated by SHIFT+RIGHT CLICK on the token. This will only be avaiable to actors that have at least one rank 1 in a magic skill.

**video of spell selector in action**

## Configuring Magic Actions

### Save

This is the most important button. Clicking _Save_ will store your entries. Closing the _Configure Spell Selector_ dialog will without saving will lose any changes.

Magic Actions are add via Configure Settings.

**Add Magic Action:**

Creates a new magic action. After creating the Magic Action, fill in the fields.

### Damage Dealing Attacks

Check the _Attack?_ checkbox to indicate that this is a damage dealing spell such as _Attack_. This will send the damage results to the chat output.

### Skill Names

Skill names are a comma separated list and must be exactly the same as on the character.

### Description

The description may have HTML but should not be wrapped in &lt;p&gt;&lt;/p&gt; other extra spacing will occur.

Use \n for paragraph breaks. Additionally, normal system dice and symbol codes may be used in all descriptions, such as [di].

**Note:** When the actions are saved, any line breaks in any descriptions will be replaced with spaces.

### Adding Effects

**Effect Name**: The name of the effect

**Skill:** If the effect is limited to a specific skill, such as Arcana, enter the name here other enter "any". The skill name must exactly match the skill name on the character sheet.

**Difficulty:** The base difficulty of the effect

**Repeatable:** 

This determines how the selection option appears on the user's effect selector sheet.

1 = Creates a checkbox

2+ = Creates a checkbox with options ranging from 0 through the value selected.

**Full Description:** The description as it appears on the user selection dialog.

**Short Description:** An abreviated description show in the chat when the spell is rolled.

## Description Codes

THe following codes may be added to the descriptions and will have specific affects if the relevant effect is selected.

#k = This will show the rank of selected _magic Knowledge_ skill. Example: "Gets #k ranks" will display as "Gets 3 ranks".

#dx? - "?" is a number that sets the damage multipler of the base damage. Example: "#dx2" will multiply the base attribute damage by 2.

#cr? - "?" is a number that sets the Critical rating. Example: "#cr3" would set the Critical rating of the spell to 3.

**Important:** #dx? and #cr? must be placed in the _Short Description_ field.

## Import and Exporting Actions and Effects

This can be used to copy stored Magic Actions between systems.

**Export Actions:** This will export the stored Magic Actions and effects to the computer clipboard.

**Import Actions:** This will open a box that the previously exported data can be pasted into.

**Image of Config options**

### Selecting Magical Knowedge skill

_Magic Knowledge Skill_ is the skill used for magical knowledge checks.

## Amplifying Information

Additional information may be added to the chat card based on the following.

### Adding Talents for selection in the Spell Selector

Talents can be selected on the spell selector and will show in the chat card for the spell. 

To add a spell, select the **3 bars** from the actors title header. Add talents by pressing the "**+**" button. 

**Scaling:** This indicates that the talent allows the user to spend something to get something based on ranks in something such as _may spend 1 strain to get 1 advantage per rank in this talent_. 

Scaling talents will have a drop down appear next to their name in the spell selector to allow the caster to select the number of levels of effect they are applying. Therefore if the talent has "strain: 2" in the description and is scaling, if the user selects 2 ranks from the spell selector drop box, the strain from this talent would be 2x2=4.

# Wound and Strain Calculation

The chat card can show the base strain that the spell will cost by modifying the description of talent on the actor.

On its own line, add "Strain: #" to the description of a talent. If the talent is scaling, this number will be multipled by the value of the selected dropdown next to the scaling talent on the spell spell selector.

The normal 2 strain, as per casting rules, is then added to this total.

Adding "Wounds: #" will show the number of wounds inflicted on the caster in the same manner as strain.

## Talents with Story Points

Only one talent may be selected that contains the text "story point". If the actor has talent that modifies the normal story point restriction, this will need to be applied manually after the roll.

## Signature Spell Talent

The spell selector will apply the benefits of the Signature Spell talent if configured as follows:

After selecting the desired spell effect, the "**+**" on the spell selector will display a dialog with the signature talent data. Paste this into the _Signature Spell_ talent's description, at the bottom.

Selecting _Signature Spell_ talent will assign the saved values to the selector and provide the -1 difficulty reduction. If the actor has _Signature Spell (Improved)_, -2 difficulty will be applied.

**Note:** The Signature Spell talent will only be avaiable if the correct magic action is applied and the selection data has been stored in talents description.

## Implements

Implements that are applied to a particular spell may also be selected from the spell selector.

To define an item as an implement, add "implement" on a line by itself in the description of the item. An implement has no effect except to show which implement was used. Any benefits the implement by bestow should be applied manually, after the roll.


## Spell Selector

**Free Column**: If a something grants a free effect, select the effect in this column.

**Select Column:** This column determines to total difficulty of the spell based on selected effects.

**Describe Spell Appearance** - this is optional and may be used to provide a narrative description of how the spell manifest: ie _a swarm of angry butterflies_.

**Spell Related Talents:** The talents that are being applied to this particular casting.

**Implements:** The implement being used for this casting. The implement does not have an effect on the roll or chat result beyond noting is usage.




