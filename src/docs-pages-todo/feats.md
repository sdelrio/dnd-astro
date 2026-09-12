---
description: Special talents and expertise providing unique capabilities
tags: [feat, feats, origin feats, character, dnd]
---
import TOCInline from '@theme/TOCInline';
import Feat from '@site/src/components/DnD/Feat';
import FeatBrowser from '@site/src/components/DnD/FeatBrowser';
import FeatTable from '@site/src/components/DnD/FeatTable';


# Feats

A feat represents a talent or an area of expertise that gives a character special capabilities. It embodies training, experience, and abilities beyond what a class provides.

You can take it only **once** unless its description says otherwise.

<style>{`
  .toc-no-bullets a { color: inherit; }
  .toc-no-bullets a:hover {
    color: var(--ifm-link-color);
    text-decoration: none; }
  .toc-no-bullets ul {
    list-style-type: none;
    font-size: 0.75em;
  }
`}</style>
<div className="toc-no-bullets">
<TOCInline toc={toc} minHeadingLevel={1} maxHeadingLevel={2} />
</div>

<div className="divider-h3">
</div>

<FeatBrowser>

## Origin Feats

These Feats are in the Origin category. Can be selected anytime you pick a feat.

<FeatTable category="Origin" />

<Feat name="Alert" level={0} book="phb">

- _**Initiative Proficiency.**_ When you roll Initiative, you can add your Proficiency Bonus to the roll.
- _**Initiative Swap.**_ Immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can't make this swap if you or the ally has the Incapacitated condition.
</Feat>

<Feat name="Crafter" level={0} book="phb">

- _**Tool Proficiency.**_ You gain proficiency with three different Artisan's Tools of your choice from the Fast Crafting table.
- _**Discount.**_ Whenever you buy a nonmagical item, you receive a 20 percent discount on it.
- _**Faster Crafting.**_ When you finish a Long Rest, you can craft one piece of gear from the Fast Crafting table, provided you have the Artisan's Tools associated with that item and have proficiency with those tools. The item lasts until you finish another Long Rest, at which point the item falls apart.

#### Fast Crafting

| Artisan's Tools | Crafted Gear |
|:-----------:|:--------------:|
| Carpenter's Tools | Ladder, Tinderbox |
| Jeweler's Tools | Bell, Caltrops (20) |
| Leatherworker's Tools] | Case, Pouch, Tent |
| Mason's Tools | Block and Tackle |
| Potter's Tools | Jug, Lamp |
| Smith's Tools  | Ball Bearings, Flask, Iron Pot |
| Tinker's Tools | Grappling Hook, Shovel |
| Weaver's Tools | Basket, Rope, Net |
| Woodcarver's Tools | Club, Greatclub, Quarterstaff |

</Feat>

<Feat name="Cult of the Dragon Initiate" level={0} book="hof">

+ _**Dragon's Tongue:**_ You know Draconic. If you already know Draconic when you select this feat, you instead learn one language of your choice from the language tables in the Player's Handbook or chapter 2 of this book.
+ _**Dragon's Terror:**_ You can take a Magic action to instill terror in a creature you can see within 30 feet of yourself. The target must succeed on a Wisdom saving throw (DC 8 plus your Wisdom modifier and Proficiency Bonus) or have the Frightened condition until the end of your next turn. If the target succeeds on the save or when the effect ends for a target, the target is immune to this effect for 24 hours.
+ _**Inspired by Fear:**_ When you cause a creature to have the Frightened condition and you are the source of its fear, you can gain Heroic Inspiration if you lack it. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.
</Feat>

<Feat name="Emerald Enclave Fledgling" level={0} book="hof">

+ _**Speak with Animals:**_ You always have the Speak with Animals spell prepared and can cast it with any spell slots you have. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat). When you cast this spell as a Ritual, its duration is 8 hours.
+ _**Tag Team:**_ When you take the Help action, you can switch places with a willing ally within 5 feet of yourself as part of that same action. This movement doesn't provoke Opportunity Attacks. You can't use this benefit if the ally has the Incapacitated condition.
</Feat>

<Feat name="Harper Agent" level={0} book="hof">

+ _**Thieves' Cant:**_ You know Thieves' Cant.
+ _**Instrument Training:**_ You gain proficiency with a Musical Instrument of your choice.
+ _**Distracting Melody:**_ When you take the Help action to assist an ally's attack roll, the enemy you're distracting can be within 30 feet of you, rather than within 5 feet of you, provided the enemy can see or hear you.
</Feat>

<Feat name="Healer" level={0} book="phb">

+ _**Battle Medic:**_ If you have a Healer's Kit, you can expend one use of it and tend to a creature within 5 feet of yourself as a Utilize action. That creature can expend one of its Hit Point Dice, and you then roll that die. The creature regains a number of Hit Points equal to the roll plus your Proficiency Bonus.
+ _**Healing Rerolls:**_ Whenever you roll a die to determine the number of Hit Points you restore with a spell or with this feat's Battle Medic benefit, you can reroll the die if it rolls a 1, and you must use the new roll.
</Feat>

<Feat name="Lords' Alliance Agent" level={0} book="hof">

+ _**Inspiring Strike:**_ Once per turn when you score a Critical Hit against a creature, you can choose an ally within 30 feet of yourself who can see or hear you and who lacks Heroic Inspiration. That ally gains Heroic Inspiration.
+ _**Reassert Honor:**_ When an enemy you can see deals damage to an ally of yours that is within 5 feet of you, you have Advantage on your next attack roll against that enemy before the end of your next turn.
</Feat>

<Feat name="Lucky" level={0} book="phb">

+ _**Luck Points.**_ You have a number of Luck Points equal to your Proficiency Bonus and can spend the points on the benefits below. You regain your expended Luck Points when you finish a Long Rest.
+ _**Advantage.**_ When you roll a d20 for a D20 Test, you can spend 1 Luck Point to give yourself Advantage on the roll.
+ _**Disadvantage.**_ When a creature rolls a d20 for an attack roll against you, you can spend 1 Luck Point to impose Disadvantage on that roll.
</Feat>

<Feat name="Magic Initiate" level={0} book="phb">

+ _**Two Cantrips.**_ You learn two cantrips of your choice from the Cleric, Druid or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat’s spells (choose when you select this feat).
+ _**Level 1 Spell.**_ Choose a level 1 spell from the Cleric, Druid or Wizard spell list. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have.
+ _**Spell Change.**_ Whenever you gain a new level, you can replace one of the spells you chose for this feat with a different spell of the same level from the chosen spell list.
+ _**Repeatable.**_ You can take this feat more than once, but you must choose a different spell list each time.
</Feat>

<Feat name="Musician" level={0} book="phb">

+ _**Instrument Training.**_ You gain proficiency with three Musical Instruments of your choice.
+ _**Encouraging Song.**_ As you finish a Short or Long Rest, you can play a song on a Musical Instrument with which you have proficiency and give Heroic Inspiration to allies who hear the song. The number of allies you can affect in this way equals your Proficiency Bonus.
</Feat>

<Feat name="Purple Dragon Rook" level={0} book="hof">

+ _**Entreat.**_ You gain proficiency in one of the following skills: Insight, Performance, or Persuasion.
+ _**Rallying Cry.**_ When you roll Initiative and don't have the Incapacitated condition, you can choose a number of creatures equal to your Proficiency Bonus that you can see within 30 feet of yourself. Those creatures gain Heroic Inspiration. Once you use this benefit, you can't do so again until you finish a Long Rest.
</Feat>

<Feat name="Savage Attacker" level={0} book="phb" youGain={false}>

You've trained to deal particularly damaging strikes. Once per turn when you hit a target with a weapon, you can roll the weapon's damage dice twice and use either roll against the target.

</Feat>

<Feat name="Skilled" level={0} book="phb" youGain={false}>

You gain proficiency in any combination of three skills or tools of your choice.
+ _**Repeatable.**_ You can take this feat more than once.
</Feat>

<Feat name="Spellfire Spark" level={0} book="hof">

+ _**Magic Absorption.**_ Once per turn, when you take damage from a spell or magical effect, you reduce the total damage taken by 1d4. You can't use this benefit if you have the Incapacitated condition.
+ _**Spellfire Flame.**_ You learn the Sacred Flame cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat). You can also cast this cantrip as a Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.
</Feat>

<Feat name="Tavern Brawler" level={0} book="phb">

+ _**Enhanced Unarmed Strike.**_ When you hit with your Unarmed Strike and deal damage, you can deal Bludgeoning damage equal to 1d4 plus your Strength modifier instead of the normal damage of an Unarmed Strike.
+ _**Damage Rerolls.**_ Whenever you roll a damage die for your Unarmed Strike, you can reroll the die if it rolls a 1, and you must use the new roll.
+ _**Improvised Weaponry.**_ You have proficiency with improvised weapons.
+ _**Push.**_ When you hit a creature with an Unarmed Strike as part of the Attack action on your turn, you can deal damage to the target and also push it 5 feet away from you. You can use this benefit only once per turn.
</Feat>

<Feat name="Tough" level={0} book="phb" youGain={false}>

Your Hit Point maximum increases by an amount equal to twice your character level when you gain this feat. Whenever you gain a character level thereafter, your Hit Point maximum increases by an additional 2 Hit Points.

</Feat>

<Feat name="Tyro of the Gauntlet" level={0} book="hof">

+ _**Stand as One.**_ When an ally within 5 feet of you is subjected to an effect that would push or pull it, you can take a Reaction to prevent that ally from being pushed or pulled. To receive this benefit, the ally can't have the Incapacitated condition.
+ _**Vigilant.**_ When you take the Ready action, the next attack roll made against you has Disadvantage before the start of your next turn.

</Feat>

<Feat name="Zhentarim Ruffian" level={0} book="hof">

+ _**Exploit Opening.**_ When you roll damage for an Opportunity Attack, you can roll the damage dice twice and use either roll against the target.
+ _**Family First.**_ If you have Heroic Inspiration when you roll Initiative, you can expend it to give yourself and your allies Advantage on that Initiative roll.

</Feat>

## General Feats

Can be selected from level 4th onwards.

<FeatTable category="General" />



<Feat name="Active Alchemy"
level={4}
abilityIncrease={["Wisdom","Intelligence"]}
youGain="You gain proficiency on Alchemist's Tools."
book="echh">

You naturally collect alchemical specimens from dead monsters.

During a long rest you can spend 10 minutes attempting to brew your specimens into a potion with an Alchemy Tools check DC 13.

If you succeed you either brew a potion of the DM’s Discretion based on the ingredients you find or roll 1d4 and refer to the brewing table below to see the effect of the potion. If you succeed the roll by 10 or more you brew enough to make 2 potions.

#### Brewing Table

| Roll | Potion |
|:-----------:|:--------------:|
| 1 | Health: The drinker’s maximum and current Hit points are increased by 2d4 for 8 hours. |
| 2 | Silvered Tongue: The drinker can roll 1d4 and add the number rolled to all charisma checks made for the next 8 hours |
| 3 | Alertness: The drinker can roll 1d4 and add the result to all initiative and perception checks made in the next 8 hours |
| 4 | Rejuvenation: The drinker’s recovers a 1st level spell slot |

</Feat>

<Feat name="Actor" level={4}
prerequisite="Charisma 13+"
abilityIncrease={["Charisma"]}
book="phb">

+ _**Impersonation.**_ While you're disguised as a real or fictional person, you have Advantage on Charisma (Deception or Performance) checks to convince others that you are that person.
+ _**Mimicry.**_ You can mimic the sounds of other creatures, including speech. A creature that hears the mimicry must succeed on a Wisdom (Insight) check to determine the effect is faked (DC 8 plus your Charisma modifier and Proficiency Bonus).
</Feat>

<Feat name="Adrenaline Surge" level={4}
abilityIncrease={["Strength","Constitution"]}
youGain={false}
book="phb">

As a bonus action you can activate an *adrenaline surge*.

For 1 minute you become resistant to bludgeoning, piercing, and slashing damage.

Once you use this ability you cannot do so again until finishing a long rest.

</Feat>

<Feat name="Arcane Shield" level={4}
prerequisite="Ability to cast arcane spells"
youGain={false}
book="fef">

+ As a reaction, when you are hit by an attack, you can sacrifice a spell or spell slot of 1st level or higher and gain a shield bonus to AC equal to the level of the spell or spell slot you sacrificed for 1 minute.

</Feat>

<Feat name="Arcane Strike" level={4}
prerequisite="Ability to cast arcane spells."
youGain={false}
book="fef">

You draw upon your arcane power to enhance your weapons with magical energy.

+ Weapons you hold glow with arcane power and count as though they are magical weapons.
+ You gain a +1 bonus to attacks and damage with these weapons as long as you are holding them.
+ Ranged weapons also grant these bonuses on attacks and damage, but the magic fades after striking their target.

</Feat>

<Feat name="Athlete" level={4}
prerequisite="Strength or Dexterity 13+"
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ _**Climb Speed.**_ You gain a Climb Speed equal to your Speed.
+ _**Hop Up.**_ When you have the Prone condition, you can right yourself with only 5 feet of movement.
+ _**Jumping.**_ You can make a running Long or High Jump after moving only 5 feet.
</Feat>

<Feat name="Augmented Conjuring" level={4}
prerequisite="Spell Focus (Conjuration)"
youGain={false}
book="fef">

Each creature you conjure with any summon spell gains +2 bonus to attack and damage rolls, and +2 hit points per Hit Dice it has.

</Feat>

<Feat name="Battlecaster" level={4}
prerequisite="The ability to cast at least one spell."
youGain={false}
book="fef">

You are skilled at casting spells with a weapon in hand.

+ You can use a weapon that you're proficient with as a spellcasting focus.
+ When wielding a magical weapon that you're proficient with and that provides a bonus to hit and damage, you can also add that weapon's bonus to damage rolls for spells you cast.
+ When casting spells that require a ranged attack roll you don't roll with disadvantage by being within 5 ft. of an enemy.

</Feat>

<Feat name="Battlefield Trickster" level={4}
abilityIncrease={["Strength","Dexterity"]}
youGain={false}
book="fef">

+ As a bonus action you can deploy caltrop or ball bearings.
+ When deployed this way the DC for these items equal to 11 + your proficiency bonus.
+ Whenever a creature fails a saving throw to resist the effects of caltrops or ball bearing you can use your reaction to make a weapon attack against that creature.
+ The trick only works once, any further try against the same creature automatically fails.

</Feat>

<Feat name="Blaster Buffet" level={4}
youGain={false}
book="fef">

For you, all cantrips that require a ranged spell attack can be made with a melee spell attack. When you do this the spell has a range of touch.

When you deal damage with a cantrip to a creature you deal an additional 1 damage to that creature.

</Feat>

<Feat name="Blowgun Injector" level={4}
abilityIncrease={["Dexterity"]}
youGain={false}
book="fef">

You gain proficiency on blowguns.

Throughout your travels you are able to harvest poisons and ointments that can be administered by soaking your blowgun ammunition throughout the day. After each long rest you gain 3 uses of each poisoned ammunition.

This ammunition loses potency if you take another long rest.

+ _**Impact poison.**_ The ammunition deals an additional 1d10 poison damage.
+ _**Rejuvenation ointment.**_ The target of the attack made with this ammunition takes 1 point of piercing damage and heals for 1d8+3 hit points.
+ _**Baneful Poison.**_ The must make a Constitution save vs DC 8 + your Dexterity modifier + your proficiency bonus. Target is under the effect of the bane spell for 1 minute

</Feat>

<Feat name="Charger" level={4}
prerequisite="Strength or Dexterity 13+"
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ _**Improved Dash:**_ When you take the Dash action, your Speed increases by 10 feet for that action.
+ _**Charge Attack:**_ If you move at least 10 feet in a straight line toward a target immediately before hitting it with a melee attack roll as part of the Attack action, choose one of the following effects: gain a 1d8 bonus to the attack's damage roll, or push the target up to 10 feet away if it is no more than one size larger than you. You can use this benefit only once on each of your turns.

</Feat>

<Feat name="Chef" level={4}
abilityIncrease={["Constitution","Wisdom"]}
book="phb">

+ _**Cook's Utensils.**_ You gain proficiency with Cook's Utensils if you don't already have it.
+ _**Replenishing Meal.**_ As part of a Short Rest, you can cook special food if you have ingredients and Cook's Utensils on hand. You can prepare enough of this food for a number of creatures equal to 4 plus your Proficiency Bonus. At the end of the Short Rest, any creature who eats the food and spends one or more Hit Dice to regain Hit Points regains an extra 1d8 Hit Points.
+ _**Bolstering Treats.**_ With 1 hour of work or when you finish a Long Rest, you can cook a number of treats equal to your Proficiency Bonus if you have ingredients and Cook's Utensils on hand. These special treats last 8 hours after being made. A creature can use a Bonus Action to eat one of those treats to gain a number of Temporary Hit Points equal to your Proficiency Bonus.

</Feat>

<Feat name="Cold Caster" level={4}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="hof">

+ _**Cantrip.**_ You learn the Ray of Frost cantrip. If you already know it, you learn a different Wizard cantrip of your choice. The spell's spellcasting ability is the ability increased by this feat.
+ _**Frostbite.**_ Once per turn when you hit a creature with an attack roll and deal Cold damage, you can temporarily negate the creature's defenses. The creature subtracts 1d4 from the next saving throw it makes before the end of your next turn.

</Feat>

<Feat name="Combat Caster" level={4} youGain={false} book="fef">

You are adept at spellcasting when threatened or distracted.

+ Whenever attempting to mantain concentration on spells in combat, you gain advantage.
+ You can cast spells even when holding weapons or shields.
+ Whenever opponents provoke attacks of opportunity, you can spend your reaction to cast a cantrip at that target.

</Feat>

<Feat name="Combat Expertise" level={4}
prerequisite="Dex 13+"
abilityIncrease={["Dexterity"]}
youGain={false}
book="fef">

+ You may choose to suffer disadvantage on all attacks in a round in order to force all opponents to suffer disadvantage on all attacks against you until the start of your next turn.

</Feat>

<Feat name="Comeback Kid" level={4}
abilityIncrease={["Constitution"]}
youGain={false}
book="fef">

+ You roll a critical success on death saving throws on a 19 or 20. You regain hit points equal to your level on a critical success
+ When you must make a death saving throw, you can choose to instead regain hit points using hit dice. Once you use this ability, you cannot do so again until you finish a long rest.

</Feat>

<Feat name="Conditioned Body"
level={4}
abilityIncrease={["Constitution"]}
youGain={false}
book="echh">


By following a strict routine, you've become accustomed to resting less than others.

+ You gain the full benefit of taking a long rest in only 4 hours, and you gain the full benefit of taking a short rest in only 30 minutes.
+ Additionally, you regain all your expended hit dice, rather than half of them, when you finish a long rest.

</Feat>

<Feat name="Conditioning" level={4}
abilityIncrease={["Strength","Constitution","Dexterity"]}
youGain={false}
book="echh">

+ Whenever you make a Strength, Dexterity, or Constitution check or saving throw you can choose to make it with advantage.

Once you use this ability you cannot do so again until you complete a short or long rest.

+ At the end of each short or long rest you gain 5 temporary hit point.

</Feat>

<Feat name="Counter-Riposte" level={4}
abilityIncrease={["Strength","Dexterity"]}
youGain={false}
book="fef">

Whenever you are wielding an non-heavy weapon and a creature you can see misses you with a melee weapon attack, you can use your reaction to force that creature use that attack roll against itself.

You can use this feature a number of times equal to your proficiency bonus, and regain all uses whenever you complete a long rest.

</Feat>

<Feat name="Crossbow Expert" level={4}
prerequisite="Dexterity 13+"
abilityIncrease={["Dexterity"]}
book="phb">

+ _**Ignore Loading.**_ You ignore the Loading property of the Hand Crossbow, Heavy Crossbow, and Light Crossbow (all called crossbows elsewhere in this feat). If you're holding one of them, you can load a piece of ammunition into it even if you lack a free hand.
+ _**Firing in Melee.**_ Being within 5 feet of an enemy doesn't impose Disadvantage on your attack rolls with crossbows.
+ _**Dual Wielding.**_ When you make the extra attack of the Light property, you can add your ability modifier to the damage of the extra attack if that attack is with a crossbow that has the Light property and you aren't already adding that modifier to the damage.

</Feat>

<Feat name="Crusher" level={4}
abilityIncrease={["Strength","Constitution"]}
book="phb">

+ _**Push.**_ Once per turn, when you hit a creature with an attack that deals Bludgeoning damage, you can move it 5 feet to an unoccupied space if the target is no more than one size larger than you.
+ _**Enhanced Critical.**_ When you score a Critical Hit that deals Bludgeoning damage to a creature, attack rolls against that creature have Advantage until the start of your next turn.

</Feat>

<Feat name="Cunning Plan" level={4}
youGain={false}
book="echh">

As an action during combat you can attempt to pull off a cunning plan.
Choose any number of allies you can see that can hear you. Those allies roll a dice of their choice and write down the result. This is called your _**planned outcome**_.

At any point during that combat when an ally roll a dice of the same type, it can choose your _**planned outcome**_ instead of rolling.
Once you use this feature you cannot do so again until you complete a short or long rest.

</Feat>

<Feat name="Defensive Duelist" level={4}
prerequisite="Dexterity 13+"
abilityIncrease={["Dexterity"]}
book="phb">

+ _**Parry.**_ If you're holding a Finesse weapon and another creature hits you with a melee attack, you can take a Reaction to add your Proficiency Bonus to your Armor Class, potentially causing the attack to miss you. You gain this bonus to your AC against melee attacks until the start of your next turn.

</Feat>

<Feat name="Desperate Reserve" level={4}
abilityIncrease={["Constitution"]}
book="echh">

When the chips are down and the situation looks dire, you rise to the occasion.
+ If you fail a saving throw, you gain advantage on the next saving throw your roll during this encounter.
+ When you have less than one-half of your maximum hit points (rounded down), your weapon attacks each round deal an extra 2 damage of the weapon type.

</Feat>

<Feat name="Dodging Expertise" level={4}
prerequisite="Dex 13+"
youGain={false}
book="fef">

+ You gain +1 bonus to your AC as long as you are not unaware of an attack.
+ Once per short or long rest, you can use a reaction to take the *Dodge* action.

</Feat>

<Feat name="Double Cast" level={4}
prerequisite="The ability to cast at least one cantrip"
youGain={false}
book="fef">

Your rapid-fire style of casting cantrips allows you to weave magic with uncanny speed, granting you the following benefit:

+ Whenever you cast a cantrip with a casting time of 1 action that can only target a single enemy, you can use your bonus action to pick a second target within 15 feet of the first taht is within range of the spell.

</Feat>

<Feat name="Down but not Out" level={4}
abilityIncrease={["Constitution"]}
youGain={false}
book="fef">

+ While at half hit points or less, you gain a +1 bonus to AC.
+ While at half hit points or less, your melee weapon attacks deal an additional 1d4 damage.

</Feat>

<Feat name="Downcaster" level={4}
prerequisite="Spellcasting feature"
youGain={false}
book="fef">

Thanks to study or deep introspection, you have achieved a firm grasp on spellcasting fundamentals, granting you the following benefit:

+ You can use a bonus action to divide a higher-level spell slot into two lower-level spell slots whose combined level is equal to or less than the original slot’s level. The lower-level spell slots must replace expended spell slots. You cannot have more available spell slots at at time than your class normally allows.

</Feat>

<Feat name="Dragonscarred" level={4}
abilityIncrease={["Constitution","Charisma"]}
book="hof">

+ _**Damage Resistance.**_ When you gain this feat, choose Acid, Cold, Fire, Lightning, or Poison. You have Resistance to the chosen damage type.
+ _**Fearsome Power.**_ When you deal damage to a creature as part of the Attack or Magic action on your turn, you can use the Dragon's Terror benefit of the Cult of the Dragon Initiate feat as a Bonus Action this turn.
</Feat>

<Feat name="Dual Wielder" level={4}
prerequisite="Strength or Dexterity 13+"
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ _**Enhanced Dual Wielding.**_ When you take the Attack action on your turn and attack with a weapon that has the Light property, you can make one extra attack as a Bonus Action later on the same turn with a different weapon, which must be a Melee weapon that lacks the Two-Handed property. You don't add your ability modifier to the extra attack's damage unless that modifier is negative.
+ _**Quick Draw.**_ You can draw or stow two weapons that lack the Two-Handed property when you would normally be able to draw or stow only one.

</Feat>

<Feat name="Durable" level={4}
abilityIncrease={["Constitution"]}
book="phb">

+ _**Defy Death.**_ You have Advantage on Death Saving Throws.
+ _**Speedy Recovery.**_ As a Bonus Action, you can expend one of your Hit Point Dice, roll the die, and regain a number of Hit Points equal to the roll.

</Feat>

<Feat name="Eldritch Adept" level={4}
prerequisite="Spellcasting or Pact Magic Feature"
youGain={false}
book="fef">

Studying occult lore, you learn one Eldritch Invocation option of your choice from the Warlock class. Your spellcasting ability for the invocation is your normal spellcasting ability. If the invocation has a prerequisite of any kind, you can choose that invocation only if you meet the prerequisite.

Whenever you gain a level, you can replace the invocation with another one.

</Feat>

<Feat name="Eldritch Lifesaver" level={4}
prerequisite="The ability to cast at least one arcane spell."
youGain={false}
book="echh">

You've learned to cannibalize the power of your spells to reinvigorate your allies.

As a bonus action, you can expend a spell slot of 1st level or higher to heal yourself or an ally within 30 feet. The number of hit points healed equals five times the level of the expended slot. In addition, the target gains temporary hit points equal to your spellcasting ability modifier.

</Feat>

<Feat name="Elemental Adept" level={4}
prerequisite="Spellcasting or Pact Magic Feature" abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="phb">

+ When you gain this feat, choose one of the following damage types: acid, cold, fire, lightning, or thunder.
+ _**Energy Mastery.**_ Spells you cast ignore Resistance to the chosen damage type. In addition, when you roll damage for a spell you cast that deals that damage type, you can treat any 1 on a damage die as a 2.

</Feat>

<Feat name="Elementary Expertise" level={4}
prerequisite="The ability to cast at least one spell"
youGain={false}
book="echh">

You can cast a 1st level spell which you know or have prepared with your spellcasting feature without expending a spell slot. When you do, treat the spell as though it were cast using a spell slot equal to your proficiency bonus. Once you cast a spell this way you cannot do so again until you complete a short or long rest.

</Feat>

<Feat name="Enclave Magic" level={4}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="hof">

+ _**Friend to Animals.**_ You have Advantage on ability checks when taking the Influence action with Beasts.
+ _**Two Hearts, One Mind.**_ You always have the _**Beast Sense**_ spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. When you cast it without a spell slot using this feature, it doesn't require Concentration. You can also cast the spell using any spell slots you have of the appropriate level. The spell's spellcasting ability is the ability increased by this feat.

</Feat>

<Feat name="Energy Recovery" level={4}
prerequisite="Spellcasting"
youGain={false}
book="echh">

You have learned to regain some of your magical energy during a rest, or you are blessed by your deity's favor (if you are a divine spellcaster)

Once per day when you finish a short rest, you can choose expended spell slots to recover.

The spell slots can have a combined leveI that is equal to or less than half your spellcaster level (rounded up), and none of the slots can be 6th level or higher.

For example, if you're a 4th-level bard, you can recover up to two leves worth of spell slots. You can recover either a 2nd-level spell slot or two 1st-level spell slots.

If you already have this feature (i.e. wizard and some druids), you can use this feature 2 times between long rests.

</Feat>

<Feat name="Expert Tactician" level={4}
abilityIncrease={["Charisma"]}
youGain={false}
book="echh">

You gain a number of tactician commands equal to your proficiency bonus. You can use these commands in several ways as listed below. you regain all commands when you complete a short or long rest.

+ _**Reposition.**_ as a bonus action a number of allies up to your Proficiency bonus can each use a reaction to move 30 feet in a direction of their choice.
+ _**Calculated Strike.**_ as a bonus action you can allow an ally within 30 feet to make a weapon attack as a reaction.

</Feat>

<Feat name="Expert Trapper" level={4}
abilityIncrease={["Wisdom"]}
youGain={false}
book="echh">

+ You gain proficiency in Survival and one tools of your choice. If you are already proficient, you gain proficiency in nature or medicine (your choice).
+ During a long rest you can take the set up traps activity. After that long rest you can make a survival check DC 15. If you succeed you collect enough food to feed yourself for the day and you craft special ammunition for the day out of the bones of the creatures you caught and fom superior timbers. You can craft 5 pieces of non-magical +1 ammunition. If you succeed the check by 10 or more you can craft 5 pieces non-magical +2 ammunition.

</Feat>

<Feat name="Fairy Trickster" level={4}
abilityIncrease={["Dexterity","Charisma"]}
book="hof">

+ _**Faerie Trod Trotter.**_ When you take the Disengage action on your turn, Difficult Terrain doesn't cost you extra movement for the rest of that turn.
+ _**Flustering Strike.**_ When you hit a creature with an attack roll, you can attempt to fluster the target. The target must succeed on a Wisdom saving throw (DC 8 plus the ability modifier of the score increased by this feat and your Proficiency Bonus) or have Disadvantage on saving throws until the end of your next turn. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

</Feat>

<Feat name="Fast as Lightning" level={4}
abilityIncrease={["Dexterity"]}
youGain={false}
book="echh">

Your reflexes are exceptionally sharp and quick, granting you the following benefits:

+ When you use your reaction to make an opportunity attack with non-heavy weapon, there's a 50% chance that your reaction is not expended.
+ Whenever you fail a Dexterity saving throw, you can immediately use a reaction to reroll this saving throw. The result of the second roll replaces the first.

</Feat>

<Feat name="Fey-Touched" level={4}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
youGain="Your exposure to the Feywild's magic grants you the following benefits."
book="phb">

+ _**Fey Magic.**_ Choose one level 1 spell from the Divination or Enchantment school of magic. You always have that spell and the _**Misty Step**_ spell prepared. You can cast each of these spells without expending a spell slot. Once you cast either spell in this way, you can’t cast that spell in this way again until you finish a Long Rest. You can also cast these spells using spell slots you have of the appropriate level. The spells’ spellcasting ability is the ability increased by this feat.

</Feat>

<Feat name="Fleet" level={4}
prerequisite="Dex 15+"
abilityIncrease={["Dexterity"]}
youGain={false}
book="fef">

+ Your movement increases by 5 feet.
+ While your are wearing light or no armor, your base speed increases by another 5 feet.
+ When you take the disengage action, you can take another action on the same turn other than the magic action or the attack action.

</Feat>

<Feat name="Genie Magic" level={4}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="hof">

+ Wish Magic. As a Magic action, you can cast a level 1 spell of your choice from the Sorcerer spell list that has a casting time of an action. Once you use this benefit, you can't do so again until you finish a Long Rest. The spell's spellcasting ability is the ability increased by this feat. When you reach level 11, the spell you cast with this feat is cast as though using a level 2 spell slot. When you reach level 17, the spell is cast as though using a level 3 spell slot.

</Feat>

<Feat name="Grappler" level={4}
prerequisite="Strength or Dexterity 13+"
abilityIncrease={["Strength","Dexterity"]}
youGain={false}
book="phb">

+ _**Punch and Grab.**_ When you hit a creature with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and the Grapple option. You can use this benefit only once per turn.
+ _**Attack Advantage.**_ You have Advantage on attack rolls against a creature Grappled by you.
+ _**Fast Wrestler.**_ You don't have to spend extra movement to move a creature Grappled by you if the creature is your size or smaller.

</Feat>

<Feat name="Great Weapon Master" level={4}
prerequisite="Strength 13+"
abilityIncrease={["Strength"]}
youGain={false}
book="phb">

+ _**Heavy Weapon Mastery.**_ When you hit a creature with a weapon that has the Heavy property as part of the Attack action on your turn, you can cause the weapon to deal extra damage to the target. The extra damage equals your Proficiency Bonus.
+ _**Hew.**_ Immediately after you score a Critical Hit with a Melee weapon or reduce a creature to 0 Hit Points with one, you can make one attack with the same weapon as a Bonus Action.

</Feat>

<Feat name="Harper Teamwork" level={4}
abilityIncrease={["Dexterity","Charisma"]}
youGain={false}
book="hof">

+ _**Withering Wordplay.**_ When you take the Help action to assist an ally's attack roll against an enemy, that enemy also has Disadvantage on the first saving throw it makes before the start of your next turn.
+ _**Inspiring Willpower.**_ If you succeed on a saving throw to end the Frightened or Paralyzed condition on yourself, you can choose one ally you can see within 30 feet of yourself that has the same condition. That condition immediately ends for that ally.

</Feat>

<Feat name="Heavily Armored" level={4}
prerequisite="Medium Armor Proficiency"
abilityIncrease={["Strength","Constitution"]}
youGain={false}
book="phb">

+ _**Armor Training.**_ You gain training with Heavy armor.

</Feat>

<Feat name="Heavy Armor Master" level={4}
prerequisite="Heavy Armor Proficiency"
abilityIncrease={["Strength","Constitution"]}
youGain={false}
book="phb">

+ _**Damage Reduction.**_ When you're hit by an attack while you're wearing Heavy armor, any Bludgeoning, Piercing, and Slashing damage dealt to you by that attack is reduced by an amount equal to your Proficiency Bonus.

</Feat>

<Feat name="Hulking Brute" level={4}
prerequisite="Strength 18+"
book="echh">

You are a broad and formidable size for your race, either due to extensive training or natural build.

+ You count as one size larger when determining your carrying capacity and the weight you can push, drag, and lift.
+ When you use a versatile weapon in one hand you roll the versatile damage die.
+ Thrown weapons attacks beyond its normal range doesn't impose disadvantage.
+ Whenever you attempt a Charisma (intimidation) check against a creature of your size or smaller, you can add your Strength modifier to the result.

</Feat>

<Feat name="Inspiring Leader" level={4}
prerequisite="Wisdom or Charisma 13+"
abilityIncrease={["Charisma","Wisdom"]}
book="phb">

You are able to mold the essence of your protective spells to fill yourself with vigor.

+ _**Bolstering Performance.**_ When you finish a Short or Long Rest, you can give an inspiring performance: a speech, song, or dance. When you do so, choose up to six allies (which can include yourself) within 30 feet of yourself who witness the performance. The chosen creatures each gain Temporary Hit Points equal to your character level plus the modifier of the ability you increased with this feat.

</Feat>

<Feat name="Invigorating Abjuration" level={4}
prerequisite="The ability to cast at least one spell"
youGain={false}
book="echh">

You are able to mold the essence of your protective spells to fill yourself with vigor.

+ _**Invigorating Abjuration.**_ Whenever you cast an abjuration spell of 1st level or higher, you gain a number of temporary hit points equal to four times the level of the spell slot used

</Feat>

<Feat name="Keen Mind" level={4}
abilityIncrease={["Charisma","Wisdom"]}
youGain={false}
book="phb">

+ _**Bolstering Performance.**_ When you finish a Short or Long Rest, you can give an inspiring performance: a speech, song, or dance. When you do so, choose up to six allies (which can include yourself) within 30 feet of yourself who witness the performance. The chosen creatures each gain Temporary Hit Points equal to your character level plus the modifier of the ability you increased with this feat.

</Feat>

<Feat name="Keep it Simple" level={4}
abilityIncrease={["Strength","Dexterity"]}
youGain={false}
book="echh">

You are adept at delivering punishment using uncomplicated combat tools, specially those that break the bones of your enemies.

+ For you, simple weapons deal an additional 2 damage
+ Whenever you make an attack with a bludgeoning simple weapon your critical range increases by 1

</Feat>

<Feat name="Larger than Life" level={4}
abilityIncrease={["Strength","Constitution"]}
book="echh">

You are muscular, corn-fed, and strong.
+ Your carrying capacity is doubled
+ At the end of each short rest or long rest you gain 5 temporary hit points.

</Feat>

<Feat name="Lightly Armored" level={4}
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ _**Armor Training.**_ You gain training with Light armor and Shields.

</Feat>

<Feat name="Lightning Stance" level={4}
abilityIncrease={["Dexterity"]}
youGain={false}
book="echh">

The speed at which you move makes it almost impossible for your opponents to strike you.

+ If you dash during your turn you gain the benefit of the dodge action.

</Feat>

<Feat name="Lordly Resolve" level={4}
abilityIncrease={["Strength","Charisma"]}
book="echh">

+ _**Standard Bearer.**_ As a Bonus Action, choose up to three creatures within 60 feet of yourself that can see you. Each target can immediately take a Reaction to right itself and end the Prone condition, provided its Speed isn't 0.

Additionally, you bolster the targets' resolve, which lasts for 1 minute or until you have the Incapacitated condition. While bolstered, a target can't be possessed or gain the Charmed or Frightened condition; if a target is already possessed, Charmed, or Frightened, the target has Advantage on any new saving throw against the relevant effect.

Once you use this benefit, you can't do so again until you finish a Long Rest.

</Feat>

<Feat name="Mage Killer" level={4}
prerequisite="Arcana proficiency"
youGain={false}
book="echh">

+ Spellcasters inside your threat area provoke attacks of opportunity when casting spells.
+ If you harm a spellcaster while they are concentrating on a spell, they suffer disadvantage on the concentration check.
+ If you see an enemy creature cast a spell, you gain +1d4 on attack rolls against that creature for one minute.

</Feat>

<Feat name="Mage Slayer" level={4}
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ _**Concentration Breaker.**_ When you damage a creature that is concentrating, it has Disadvantage on the saving throw it makes to maintain Concentration.
+ _**Guarded Mind.**_ If you fail an Intelligence, a Wisdom, or a Charisma saving throw, you can cause yourself to succeed instead. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.

</Feat>

<Feat name="Magical Prodigy" level={4}
prerequisite="Spellcasting or Pact Magic feature. Spellcasting ability score 16+"
youGain={false}
book="echh">

You have an innate affinity to magic. You can prepare an extra 1st level spell and you gain an extra spell slot which is always of the highest level you can cast (up to a maximum of 5th level)

</Feat>

<Feat name="Magical Reminiscence" level={4}
prerequisite="The ability to cast at least one spell"
book="echh">

+ In a pinch, you can strain yourself to recall one of your latent spells to your mind.
+ At any time, you can add a spell to your list of prepared spells (no action required). This spell must be among the spells you know (spellbook for wizards, class list for other classes). You can then cast the added spell normally, by spending the necessary casting time, components, and spell slot. This spell is lost when you finish a long rest. Once you use this feature, you cannot use it again until you finish a long rest.

</Feat>

<Feat name="Marksman" level={4}
abilityIncrease={["Dexterity"]}
youGain={false}
book="echh">

As a condition for making use of this feat, you must forsake your movement on this turn.

Whenever you take the Attack action with a ranged weapon against a target that you can see, you can use a bonus action to gain one of the following benefits:

+ _**Focus.**_ You cannot have disadvantage to your next attack, unless you have disadvantage from multiple sources at the same time. Additionally, your attack ignores half cover and three-quarters cover.
+ _**Take Aim.**_ If your next attack is successful, add a +2 bonus to the damage. In addition, your attack scores a critical hit on a roll of 19 or 20.

</Feat>

<Feat name="Martial Weapon Training" level={4}
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ Weapon Proficiency. You gain proficiency with Martial weapons.

</Feat>

<Feat name="Master of Magic" level={4}
prerequisite="Magical Prodigy feat. Spellcasting ability score 18+. Arcane spellcasting or Divine spellcasting."
youGain={false}
book="echh">

You spellcasting abilities are extraordinary. You gain an extra spell slot for each level between 1st and 4th, provided you are able to cast spells of those levels.

</Feat>

<Feat name="Master of High Magic" level={4}
prerequisite="Master of Magic feat. Spellcasting ability score 18+. Arcane spellcasting or Divine spellcasting."
youGain={false}
book="echh">

You gain an extra spell slot of 6th and 7th levels, provided you already have a 7th-level spell slot.

</Feat>

<Feat name="Meditation" level={4}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
youGain={false}
book="echh">

+ Whenever you make a intelligence, wisdom, or charisma saving throw you can choose to make it with advantage.

Once you use this ability you cannot do so again until you complete a short or long rest.

+ At the end of each short or long rest you gain 5 temporary hit points.

</Feat>

<Feat name="Medium Armor Master" level={4}
prerequisite="Medium Armor Proficiency"
abilityIncrease={["Strength","Dexterity"]} book="phb">

+ _**Dexterous Wearer.**_ While you're wearing Medium armor, you can add 3, rather than 2, to your AC if you have a Dexterity score of 16 or higher.

</Feat>

<Feat name="Metamagic Adept" level={4}
prerequisite="Spellcasting or Pact Magic feature"
youGain={false}
book="echh">

You've learned how to exert your will on your spells to alter how they function:

+ You learn two Metamagic options of your choice from the sorcerer class. You can use only one Metamagic option on a spell when you cast it, unless the option says otherwise. Whenever you reach a level that grants the Ability Score Improvement feature, you can replace one of these Metamagic options with another one from the sorcerer class.
+ You gain 2 sorcery points. You regain all spent sorcery points when you finish a long rest.

</Feat>

<Feat name="Metamagic: Preserved Spell" level={4}
prerequisite="Spellcasting ability score 16+" youGain={false}
book="echh">

+ You gain 2 sorcery points.
+ You learn the Preserved Spell metamagic option

#### Preserved Spell

When you cast a spell that requires concentration, you can spend 2 sorcery points to remove the concentration component to maintain the spell’s effect for the duration.

Instead, you must use a bonus action on each of your turns to sustain the effect, which immediately ends if you fail to take this action.

</Feat>

<Feat name="Moderately Armored" level={4}
prerequisite="Light Armor Proficiency"
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ _**Armor Training.**_ You gain training with Medium armor.

</Feat>

<Feat name="Mounted Combatant" level={4} abilityIncrease={["Strength","Wisdom","Dexterity"]} book="phb">

+ _**Mounted Strike.**_ While mounted, you have Advantage on attack rolls against any unmounted creature within 5 feet of your mount that is at least one size smaller than the mount.
+ _**Leap Aside.**_ If your mount is subjected to an effect that allows it to make a Dexterity saving throw to take only half damage, it instead takes no damage if it succeeds on the saving throw and only half damage if it fails. For your mount to gain this benefit, you must be riding it, and neither of you can have the Incapacitated condition.
+ _**Veer.**_ While mounted, you can force an attack that hits your mount to hit you instead if you don't have the Incapacitated condition.

</Feat>

<Feat name="Mythal Touched" level={4} abilityIncrease={["Charisma","Wisdom","Intelligence"]} book="hof">

+ _**Mythal Ward.**_ If a spell attack hits you or you fail a saving throw against a spell, you can take a Reaction to roll on the Mythal-Touched Magic table to create a magical effect. If an effect requires a saving throw, the DC equals 8 plus the modifier of the ability increased by this feat and your Proficiency Bonus.

You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

#### Mythal-Touched Magic

| 1d20 | Effect |
|:-----------:|:--------------:|
| 1-2 | You and each creature within 15 feet of you make a Dexterity saving throw, taking Force damage equal to 1d8 times the level of the triggering spell on a failed save or half as much damage on a successful one. |
| 3-7 | You and the triggering spell's caster form a telepathic link for 1 hour. |
| 8-10 | Gravity is reversed in a 15-foot-radius, 60-foot-tall Cylinder centered on you for 1 minute, per the Reverse Gravity spell. |
| 11-13 | You and the triggering spell's caster each make a Constitution saving throw. On a failed save, the creature has the Stunned condition until the end of its next turn. |
| 14-17 | You gain a +2 bonus to AC for 1 minute, potentially turning the triggering spell into a miss if it was a spell attack. |
| 18-19 | Any flammable, nonmagical object within 10 feet of the triggering spell's caster that isn't being worn or carried by another creature bursts into flame, takes 1d4 Fire damage, and is burning. |
| 20 | The triggering spell dissipates with no effect, and the action, Bonus Action, or Reaction used to cast it is wasted. If that spell was cast with a spell slot, the slot isn't expended. |

</Feat>

<Feat name="Nimble Physique" level={4} prerequisite="Dexterity 14 or higher" abilityIncrease={["Dexterity"]} youGain={false}>

You are small and thin for your race. You have a mysterious and consistent ability to avoid danger.
This feat grants the following benefits:

+ As long as you are not wearing armour, you may take the dodge action as a bonus action. You can use this feature a number of times equal to your Dexterity modifier (minimum of once) per long rest.
+ You can fit and squeeze through spaces as though you were one size smaller than you are.
+ Moving through spaces occupied by allies does not impose movement penalties.
</Feat>

<Feat name="Observant" level={4} prerequisite="Intelligence or Wisdom 13+" abilityIncrease={["Wisdom","Intelligence"]} book="phb">

+ _**Keen Observer.**_ Choose one of the following skills: Insight, Investigation, or Perception. If you lack proficiency with the chosen skill, you gain proficiency in it, and if you already have proficiency in it, you gain Expertise in it.
+ _**Quick Search.**_ You can take the Search action as a Bonus Action.

</Feat>

<Feat name="Order's Resilience" level={4} prerequisite="Prerequisite: Level 4+, Tyro of the Gauntlet Feat" abilityIncrease={["Strength","Charisma","Wisdom"]} book="hof">

+ _**Resurge.**_ When you have the Prone condition, you can right yourself with only 5 feet of movement.
+ _**Stronger Together.**_ If you are within 5 feet of an ally that doesn't have the Incapacitated condition, you and that ally have Advantage on Strength saving throws. You can't use this benefit while you have the Incapacitated condition.

</Feat>

<Feat name="Overly Prepared" level={4} youGain={false}>

+ You can take the ready action without a specific trigger. Anytime, after a character has finished its turn, you can activate your readied action.

</Feat>

<Feat name="Overwhelming Elemental Power" level={4} prerequisite="Elemental Adept Feat" abilityIncrease={["Charisma","Wisdom","Intelligence"]}>

+ _**Overwhelming Power.**_ If a creature would be immune to the elemental damage from your elemental adept feat, it instead has resistance to that damage. This effect doesn't stack further with elemental adept (i.e. the resistance isn't bypassed by the effects of elemental adept but it can by further bypassed by spells or other effects)

</Feat>

<Feat name="Parry Spell" level={4} prerequisite="Dex 13+, Arcana proficiency" youGain={false}>

+ As a reaction, you can attempt to parry any spell that requires an attack roll. You make an attack roll against the attack roll of the incoming spell attack. If you succed, you parry the spell away harmlessly.
+ If you take a -5 penalty to your parry roll and succeed, you can parry teh spell back at its caster. Use your parry roll as the spell attack roll.

</Feat>

<Feat name="Parting Shot" level={4} prerequisite="Dex 15+" youGain={false}>

+ When you use the disengage action, you can make a single ranged attack at any point during your movement as a bonus action.

</Feat>

<Feat name="Piercer" level={4} abilityIncrease={["Strength","Dexterity"]} book="phb">

+ _**Puncture.**_ Once per turn, when you hit a creature with an attack that deals Piercing damage, you can reroll one of the attack's damage dice, and you must use the new roll.
+ _**Enhanced Critical.***_ When you score a Critical Hit that deals Piercing damage to a creature, you can roll one additional damage die when determining the extra Piercing damage the target takes.

</Feat>

<Feat name="Poisoner" level={4} abilityIncrease={["Dexterity","Intelligence"]} book="phb">

+ _**Potent Poison.**_ When you make a damage roll that deals Poison damage, it ignores Resistance to Poison damage.
+ _**Brew Poison.**_ You gain proficiency with the Poisoner's Kit. With 1 hour of work using such a kit and expending 50 GP worth of materials, you can create a number of poison doses equal to your Proficiency Bonus. As a Bonus Action, you can apply a poison dose to a weapon or piece of ammunition. Once applied, the poison retains its potency for 1 minute, or until you deal damage with the poisoned item, whichever is shorter. When a creature takes damage from the poisoned item, that creature must succeed on a Constitution saving throw (DC 8 plus the modifier of the ability increased by this feat and your Proficiency Bonus) or take 2d8 Poison damage and have the Poisoned condition until the end of your next turn.

</Feat>

<Feat name="Polearm Master" level={4} prerequisite="Strength or Dexterity 13+" abilityIncrease={["Dexterity","Strength"]} book="phb">

+ _**Pole Strike.**_ Immediately after you take the Attack action and attack with a Quarterstaff, a Spear, or a weapon that has the Heavy and Reach properties, you can use a Bonus Action to make a melee attack with the opposite end of the weapon. The weapon deals Bludgeoning damage, and the weapon's damage die for this attack is a d4.
+ _**Reactive Strike.**_ While you're holding a Quarterstaff, a Spear, or a weapon that has the Heavy and Reach properties, you can take a Reaction to make one melee attack against a creature that enters the reach you have with that weapon.

</Feat>

<Feat name="Precognitive" level={4}
prerequisite="Wisdom 14+"
abilityIncrease={["Wisdom"]}
youGain={false}
book="echh">

+ You sometimes feel impressions of events an instant before they happen. When you begin your turn, you can choose to roll a d20 and record the number rolled. One attack roll, ability check, or saving throw you make before the end of your turn can be replaced with this roll. If you choose not to use the number rolled, it is expended. You can use this ability three times and regain all expended uses when you finish a long rest.

</Feat>

<Feat name="Privilege of the Wise" level={4}
abilityIncrease={["Wisdom"]}
youGain={false}
book="echh">

You are cunning, granting you the following benefits.

+ When you succeed on a Wisdom saving throw and would suffer an effect on the success, you instead suffer no effect.
+ When you make an a Charisma ability check, you can leverage your will to use Wisdom instead of Charisma, keeping whatever skill you would have ordinarily used to make the check (if any).
+ If you are asked a question to which you do not know the answer, you recall a substantiated rumor as to where the answer can be found (if it exists).

</Feat>

<Feat name="Protective Transmutation" level={4}
prerequisite="The ability to cast at least one spell"
abilityIncrease={["Intelligence","Wisdom","Charisma"]}
youGain={false}
book="echh">

You are able to use your magic to bolster yourself against assaults.

+ _**Reactive Shell.**_ When you are about to take damage, you can use your reaction before the damage is rolled to expend a spell slot and gain resistance to the type of the incoming damage until the start of your next turn. If you expend a spell slot of 5th level or higher, you instead gain immunity to this type of damage until the start of your next turn.

</Feat>

<Feat name="Punisher" level={4}
abilityIncrease={["Strength","Dexterity"]}
book="echh"
youGain={false}>

+ You make attacks of opportunity with advantage.
+ Whenever a creature stands up from prone you can make an attack of opportunity against that creature as a reaction.

</Feat>

<Feat name="Purple Dragon Commandant" level={4} prerequisite="Prerequisite: Level 4+, Purple Dragon Rook Feat or Martial Weapon Proficiency" abilityIncrease={["Strength","Dexterity"]} book="hof">

+ _**Encourage Ally.**_ As a Bonus Action, you bolster one ally you can see within 30 feet. The ally gains Temporary Hit Points equal to 2d6 plus the modifier of the ability score increased by this feat. You can take this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all uses when you finish a Long Rest.
+ _**Last Stand.**_ You have Advantage on attack rolls while Bloodied.

</Feat>

<Feat name="Quick Adaptation" level={4}
abilityIncrease={["Constitution"]}
book="echh"
youGain={false}>

+ You gain proficiency in one saving throw of your choice
+ If you are forced to make a saving throw to overcome an effect currently afflicting you gain advantage on that saving throw.
+ You have advantage when attempting to break out of a grapple or an effect that is restraining you.

</Feat>

<Feat name="Reactive" level={4}
prerequisite="Dexterity 18+, Fast as Lightning Feat"
abilityIncrease={["Dexterity"]}
book="echh"
youGain={false}>

+ When a creature hits you with a melee attack, you can spend your reaction to make an opportunity attack against the attacker if it is within 5 feet of you.

</Feat>

<Feat name="Resilient" level={4}
abilityIncrease={["Constitution"]}
book="phb">

+ _**Saving Throw Proficiency.**_ You gain saving throw proficiency with the chosen ability.

</Feat>

<Feat name="Ritual Caster" level={4} prerequisite="Intelligence, Wisdom or Charisma 13+" abilityIncrease={["Charisma","Wisdom","Intelligence"]} book="phb">

+ _**Ritual Spells.**_ Choose a number of level 1 spells equal to your Proficiency Bonus that have the Ritual tag. You always have those spells prepared, and you can cast them with any spell slots you have. The spells' spellcasting ability is the ability increased by this feat. Whenever your Proficiency Bonus increases thereafter, you can add an additional level 1 spell with the Ritual tag to the spells always prepared with this feature.
+ _**Quick Ritual.**_ With this benefit, you can cast a Ritual spell that you have prepared using its regular casting time rather than the extended time for a Ritual. Doing so doesn't require a spell slot. Once you cast the spell in this way, you can't use this benefit again until you finish a Long Rest.

</Feat>

<Feat name="Seeker of Seven Songs" level={4}
abilityIncrease={["Charisma"]}
book="echh"
youGain="You belong to the ancient order of the Seven Songs, granting you the following benefit.">

+ You gain proficiency in _**Performance**_. If you are already proficient, you instead double your proficiency bonus when making ability checks using Performance.
+ When you gain a level, you can choose to write a song about the experiences you endured to accomplish such a feat. When you do so, you gain half-proficiency on a skill of your choice.
+ When the DM awards a character other than you inspiration, you are also awarded inspiration.

</Feat>

<Feat name="Sentinel" level={4}
prerequisite="Stength or Dexterity 13+"
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ _**Guardian.**_ Immediately after a creature within 5 feet of you takes the Disengage Action or hits a target other than you with an attack, you can make an Opportunity Attack against that creature.
+ _**Halt.**_ When you hit a creature with an Opportunity Attack, the creature's Speed becomes 0 for the rest of the current turn.

</Feat>

<Feat name="Shadow-Touched" level={4}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="phb"
youGain="Your exposure to the Shadowfell's magic grants you the following benefits.">

+ _**Shadow Magic.**_ Choose one level 1 spell from the Illusion or Necromancy school of magic. You always have that spell and the Invisibility spell prepared. You can cast each of these spells without expending a spell slot. Once you cast either spell in this way, you can't cast that spell in this way again until you finish a Long Rest. You can also cast these spells using spell slots you have of the appropriate level. The spells' spellcasting ability is the ability increased by this feat.

</Feat>

<Feat name="Sharpshooter" level={4}
prerequisite="Dexterity 13+"
abilityIncrease={["Dexterity"]}
book="phb">

+ _**Bypass Cover.**_ Your ranged attacks with weapons ignore Half Cover and Three-Quarters Cover.
+ _**Firing in Melee.**_ Being within 5 feet of an enemy doesn't impose Disadvantage on your attack rolls with Ranged weapons.
+ _**Long Shots.**_ Attacking at long range doesn't impose Disadvantage on your attack rolls with Ranged weapons.

</Feat>

<Feat name="Shield Bearer" level={4}
abilityIncrease={["Strength","Dexterity"]}
book="fef"
youGain={false}>

You are a fearsome foe with a shield, capable of skillfully protecting yourself and striking back at your enemies.

As long as you are equipped with a shield, you gain the following benefits:

+ If you do not move during your turn, you gain half cover (see the Combat chapter: Cover) until the start of your next turn. This benefit does not apply if you are incapacitated.
+ Whenever a creature misses you with a melee attack, you can use your reaction to retaliate against your attacker. Make an shield bash attack against your attacker that deals bludgeoning damage equal to 1d4 + your Strength/Dexterity modifier (your choice).

</Feat>

<Feat name="Shield Master" level={4}
prerequisite="Shield Proficiency"
abilityIncrease={["Strength"]}
book="phb">

+ _**Shield Bash.**_ If you attack a creature within 5 feet of you as part of the Attack action and hit with a Melee weapon, you can immediately bash the target with your Shield if it's equipped, forcing the target to make a Strength saving throw (DC 8 plus your Strength modifier and Proficiency Bonus). On a failed save, you either push the target 5 feet from you or cause it to have the Prone condition (your choice). You can use this benefit only once on each of your turns.
+ _**Interpose Shield.**_ If you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you can take a Reaction to take no damage if you succeed on the saving throw and are holding a Shield.

</Feat>

<Feat name="Sidestep" level={4}
abilityIncrease={["Dexterity"]}
prerequisiste="Dex 13+"
book="fef"
youGain={false}>

You can reposition yourself after a foe's missed swing.

+ Whenever an opponent misses you with a melee attack, you may move 5 feet as a reaction. This movement does not provoke opportunity attackas and does not count against your total movement.

</Feat>

<Feat name="Skill Expert" level={4}
abilityIncrease={["Choice"]}
book="phb">

+ _**Skill Proficiency.**_ You gain proficiency in one skill of your choice.
+ _**Expertise.**_ Choose one skill in which you have proficiency but lack Expertise. You gain Expertise with that skill.

</Feat>

<Feat name="Skulker" level={4}
prerequisite="Dexterity 13+"
abilityIncrease={["Dexterity"]}
book="phb">

+ _**Blindsight.**_ You have Blindsight with a range of 10 feet.
+ _**Fog of War.**_ You exploit the distractions of battle, gaining Advantage on any Dexterity (Stealth) check you make as part of the Hide action during combat.
+ _**Sniper.**_ If you make an attack roll while hidden and the roll misses, making the attack roll doesn't reveal your location.

</Feat>

<Feat name="Slasher" level={4}
abilityIncrease={["Strength","Dexterity"]}
book="phb">

+ _**Hamstring.**_ Once per turn when you hit a creature with an attack that deals Slashing damage, you can reduce the Speed of that creature by 10 feet until the start of your next turn.
+ _**Enhanced Critical.**_ When you score a Critical Hit that deals Slashing damage to a creature, it has Disadvantage on attack rolls until the start of your next turn.

</Feat>

<Feat name="Sleuthing" level={4}
abilityIncrease={["Intelligence"]}
book="echh"
youGain={false}>

+ You can cast the spell Find Traps with this feat a number of times per day equal to your intelligence modifier.

When you cast Find Traps this way you also learn the location of the nearest trap.

+ You can cast Locate Object or Locate Creature with this feat. Once you cast one of these spells you cannot cast either of them again until you complete a long rest.

When casting a spell with this feat, intelligence is your casting modifier.

</Feat>

<Feat name="Speedy" level={4} prerequisite="Dexterity or Constitution 13+" abilityIncrease={["Dexterity","Constitution"]} book="phb">

+ _**Speed Increase.**_ Your Speed increases by 10 feet.
+ _**Dash over Difficult Terrain.**_ When you take the Dash action on your turn, Difficult Terrain doesn't cost you extra movement for the rest of that turn.
+ _**Agile Movement.**_ Opportunity Attacks have Disadvantage against you.

</Feat>

<Feat name="Spellblade" level={4}
prerequisite="Spellcasting ability 15+"
abilityIncrease={["Intelligence","Wisdom","Charisma"]}
book="echh"
youGain="You’ve learned to meld your strikes with sparks of arcane magic, gaining the following benefits:">

+ You gain mastery in one weapon you are proficient with.
+ Your weapon attacks are magical
+ You learn two cantrips of your choice from the wizard spell list. Intelligence is your spellcasting ability for these spells.
+ You learn the shield spell and you always have it prepared. You can cast it once without using a spell slot. Once you cast this spell using this feat, you can’t do so again until you finish a long rest.

</Feat>

<Feat name="Spellfire Adept" level={4}
prerequisite="Spellfire Spark Feat or the Spellcasting or Pact Magic Feature"
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="hof">

+ _**Fueled Spellfire.**_ Once per turn, when a spell you cast deals Radiant damage, you can expend up to two Hit Point Dice, roll them, and add the total rolled to one damage roll of the spell.
+ _**Searing Spellfire.**_ When you make a damage roll that deals Radiant damage, it ignores Resistance to Radiant damage.

</Feat>

<Feat name="Spell Focus" level={4}
prerequisite="Ability to cast spells."
book="echh"
youGain={false}>

Choose a school of magic.

+ The spell save DC and spell attack rolls of your spells from the chosen school increases by 1.
+ You gain advantage on all saves against spells from that school of magic.
+ You cannot learn or cast spells from the opposed school of magic. You can replace the spells you know from your opposed school with spells from your chosen school.

</Feat>

<Feat name="Spellmarked" level={4}
prerequisite="Sorcerer"
book="echh"
youGain={false}>

The marks created by wild magic are as varied as magic itself and can come in many different shapes, sizes, and colors. The magical attributes they imbue the subject with are even more varied, with the only common denominator being that a spellmark always comes with both a boon and a drawback.

#### Random Spellmark Table

| Roll | Result |
|:-----------:|:--------------:|
| 1-2 | Alloy |
| 3-5 | Conduit |
| 6-7 | Magesight |
| 8-9 | Omen |
| 10-12 | Spellmantle |
| 13-14 | Mindmage |
| 15-16 | Weavewraith |
| 17-18 | Wildfire |
| 19-20 | Unstable |

</Feat>

<Feat name="Spell Penetration" level={4}
prerequisite="Spell Focus Feat"
book="echh"
youGain={false}>

When casting a spell of the school you have chose for Spell Focus, you ignore resistance of targets.

</Feat>

<Feat name="Spell Sniper" level={4}
prerequisite="Spellcasting or Pact Magic Feature"
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="phb">

+ _**Bypass Cover.**_ Your attack rolls for spells ignore Half Cover and Three-Quarters Cover.
+ _**Casting in Melee.**_ Being within 5 feet of an enemy doesn't impose Disadvantage on your attack rolls with spells.
+ _**Increased Range.**_ When you cast a spell that has a range of at least 10 feet and requires you to make an attack roll, you can increase the spell's range by 60 feet.

</Feat>

<Feat name="Street Justice" level={4}
abilityIncrease={["Strength","Dexterity"]}
book="hof">

+ _**Headlock.**_ Your allies have Advantage on attack rolls against a creature Grappled by you.
+ _**Sturdy Knot.**_ When you use Chain, Manacles, or Rope to bind a creature, add your Proficiency Bonus to the DC to escape or burst the Chain, Manacles, or Rope.
+ _**Tough Talk.**_ A creature's Hostile attitude doesn't impose Disadvantage on your Charisma (Intimidation) checks to influence that creature.

</Feat>

<Feat name="Strong Grip" level={4}
abilityIncrease={["Strength"]}
book="echh"
youGain={false}>

You've learned to use the weight of your weapons effectively, and have adapted to use large weapons one-handed.

+ When wielding a versatile weapon in one hand, you may use the versatile damage die. You can wield non-heavy melee weapons in one hand.
+ You can wield a non-heavy melee weapon in each hand. The weapons don't need to have the light property, but you cannot use the versatile property when wielding versatile weapons this way.

</Feat>

<Feat name="Telekinetic" level={4} abilityIncrease={["Charisma","Wisdom","Intelligence"]} book="phb">

+ _**Minor Telekinesis.**_ You learn the Mage Hand spell. You can cast it without Verbal or Somatic components, you can make the spectral hand Invisible, and its range and the distance it can be away from you both increase by 30 feet when you cast it. The spell's spellcasting ability is the ability increased by this feat.
+ _**Telekinetic Shove.**_ As a Bonus Action, you can telekinetically shove one creature you can see within 30 feet of yourself. When you do so, the target must succeed on a Strength saving throw (DC 8 plus the ability modifier of the score increased by this feat and your Proficiency Bonus) or be moved 5 feet toward or away from you.

</Feat>

<Feat name="Telepathic" level={4} abilityIncrease={["Charisma","Wisdom","Intelligence"]} book="phb">

+ _**Telepathic Utterance.**_ You can speak telepathically to any creature you can see within 60 feet of yourself. Your telepathic utterances are in a language you know, and the creature understands you only if it knows that language. Your communication doesn't give the creature the ability to respond to you telepathically.
+ _**Detect Thoughts.**_ You always have the Detect Thoughts spell prepared. You can cast it without a spell slot or spell components, and you must finish a Long Rest before you can cast it in this way again. You can also cast it using spell slots you have of the appropriate level. Your spellcasting ability for the spell is the ability increased by this feat.

</Feat>

<Feat name="Tireless" level={4}
abilityIncrease={["Constitution"]}
book="echh">

Through sheer grit and years of hardship and survival under the most grueling conditions, you have learned to push on through fatigue that would cripple a lesser hero.

+ Reduce any exhaustion penalty you suffer by 2 levels (for example, if you have 4 exhaustion levels, you only suffer the penalty of 2 exhaustion levels).

</Feat>

<Feat name="Torch Master" level={4}
abilityIncrease={["Strength","Constitution","Dexterity"]}
book="echh"
youGain={false}>

+ You become proficient with torches.
+ You can light a torch as a bonus action.
+ Whenever you hit a creature with a lit torch it deals 1d4 bludgeoning damage + 1d6 fire damage.
+ As an action you can fan the fire of a torch a release it in a spectacular display. All creatures in a 15-foot cone must make a dexterity saving throw against your torch DC (8 + your strength modifier + your proficiency bonus) or take 3d6 fire damage. After using this action, the torch is unusable.

</Feat>

<Feat name="Unrelenting Caster" level={4}
prerequisite="The ability to cast at least one spell"
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="echh"
youGain="Whoever resists your spell is in for a demonstration of your tenacity.">

+ Whenever you cast a spell of 1st level or higher and fail to affect any creature, you can immediately cast a cantrip you know. This benefit does not apply if a target makes a successful saving throw but still takes damage, a condition, or any other negative effect from your spell.

</Feat>

<Feat name="Upcaster" level={4}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="echh"
prerequisite="Spellcasting feature" youGain={false}>

+ As a free action, you can expend two spell slots of the same level to create a spell slot that is one level higher.

</Feat>

<Feat name="War Caster" level={4} prerequisite="Spellcasting or Pact Magic Feature" abilityIncrease={["Charisma","Wisdom","Intelligence"]} book="phb">

+ _**Concentration.**_ You have Advantage on Constitution Saving Throws that you make to maintain Concentration.
+ _**Reactive Spell.**_ When a creature provokes an Opportunity Attack from you by leaving your reach, you can take a Reaction to cast a spell at the creature rather than making an Opportunity Attack. The spell must have a casting time of one action and must target only that creature.
+ _**Somatic Components.**_ You can perform the Somatic components of spells even when you have weapons or a Shield in one or both hands.

</Feat>

<Feat name="Weapon Master" level={4} abilityIncrease={["Strength","Dexterity"]} book="phb">

+ _**Mastery Property.**_ Your training with weapons allows you to use the mastery property of one kind of Simple or Martial weapon of your choice, provided you have proficiency with it. Whenever you finish a Long Rest, you can change the kind of weapon to another eligible kind.

</Feat>

<Feat name="Wyrd Magic" level={4}
book="echh"
prerequisite="Spellcasting or Pact Magic feature"
youGain={false}>

#### Wyrd Spells

A character casting a spell using wyrd magic can imbue their spells with the chaotic forces of the world.
When a character casts a spell, which involves rolling dice, it can declare that spell to be a wyrd spell. Upon using wyrd magic, when the spell’s dice are rolled and for each of the highest possible values rolled on the dice, you add the maximum value of the dice to the total (e.g. if you roll damage for a fireball and any of the d6's shows a 6, you add a +6 bonus to the damage roll for each dice showing a 6). After the wyrd spell is cast, you then gain 1 level of exhaustion.

#### Whimsy

When the character is granted Inspiration, they can choose not to gain inspiration and instead roll a d100, gaining a whimsy according to the table below. A whimsy lasts until it is used, or until an affected creature finishes a long rest.
A spell cast using a whimsy requires no components, and a creature uses its spell save DC and spell attack bonus when casting a whimsy; all other elements of the spell remain the same.

</Feat>

<Feat name="Zhentarim Tactics" level={4} prerequisite="Zhentarim Ruffian Feat" abilityIncrease={["Dexterity","Charisma"]} book="hof">

+ _**Retaliate.**_ Immediately after a creature within 5 feet of you hits you with a melee attack, you can make an Opportunity Attack against that creature.
+ _**Versatile Merc.**_ When you finish a Long Rest, choose a skill in which you have proficiency. You have Expertise in that skill until you finish your next Long Rest.

</Feat>

## L19: Epic Boons Feats

Can be selected from level 19th onwards.

<FeatTable category="L19" />



<Feat name="Boon of Bloodshed" level={19}
abilityIncrease={["Strenght","Dexterity","Constitution","Intelligence","Wisdom","Charisma"]}
abilityMax={30}
book="hof">

+ _**Killer's Fortune.**_ When an enemy you can see is reduced to 0 Hit Points, you gain Advantage on the next attack roll you make before the end of your next turn.
+ _**Power from Pain.**_ Once per turn, when you make an attack roll while Bloodied, you can deal extra damage to the target equal to your Proficiency Bonus. The extra damage's type is the same as the attack's type.

</Feat>

<Feat name="Boon of Boutiful Health" level={19}
abilityMax={30}
book="echh"
abilityIncrease={["Strenght","Dexterity","Constitution","Intelligence","Wisdom","Charisma"]}>

+ _**Augmented Health.**_ When you gain Temporary Hit Points, increase the number of Temporary Hit Points you gain by 5.
+ _**Superior Recuperation.**_ When you spend one or more Hit Point Dice to regain Hit Points, you can instead use the highest number possible for each die.

</Feat>

<Feat name="Boon of Combat Prowess" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]}
abilityMax={30}
book="phb">

+ _**Peerless Aim.**_ When you miss with an attack roll using a weapon or an Unarmed Strike, you can hit instead. Once you use this benefit, you can't use it again until the start of your next turn.

</Feat>

<Feat name="Boon of Communication" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
abilityMax={30}
book="hof">

+ _**Cunning Speaker.**_ You don't have Disadvantage on ability checks to influence Hostile creatures.
+ _**Gifted Interpreter.**_ You understand the literal meaning of any language you hear or see signed, and you can understand the literal meaning of any written language you see.
+ _**Mental Communication.**_ You gain telepathy with a range of 120 feet.

</Feat>

<Feat name="Boon of Desperate Resilience" level={19}
abilityIncrease={["Strength","Constitution"]}
book="hof">

+ _**Defense of Body and Mind.**_ While you are Bloodied, you have Resistance to every damage type except Force.

</Feat>

<Feat name="Boon of Dimensional Travel" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]}
abilityMax={30}
book="phb">

+ _**Blink Steps.**_ Immediately after you take the Attack action or the Magic action, you can teleport up to 30 feet to an unoccupied space you can see.

</Feat>

<Feat name="Boon of Energy Infusion" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]}
abilityMax={30}
book="phb">

+ _**Elemental Affinity.**_ You develop a particular affinity for types of elemental energy, which you can manipulate at will.

When you select this Epic Boon, choose a damage type from the following: acid, cold, fire, lightning, or thunder.

+ If a creature would be immune to the elemental damage of the chosen damage type, it instead has resistance to that damage.
+ All spells that would deal damage of the damage type you selected when you gained this Epic Boon deal one additional damage dice.
+ When you would take damage of the selected damage type you can take a reaction to absorb the incoming damage. You take no damage instead and you gain temporary hit points equal to half the damage it would have been dealt. You can use this ability three times, and you regain all expended uses when you finish a long rest

</Feat>

<Feat name="Boon of Energy Resistance" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]} abilityMax={30} book="phb">

+ _**Energy Resistances.**_ You gain Resistance to two of the following damage types of your choice: Acid, Cold, Fire, Lightning, Necrotic, Poison, Psychic, Radiant, or Thunder. Whenever you finish a Long Rest, you can change your choices.
+ _**Energy Redirection.**_ When you take damage of one of the types chosen for the Energy Resistances benefit, you can take a Reaction to direct damage of the same type toward another creature you can see within 60 feet of yourself that isn't behind Total Cover. If you do so, that creature must succeed on a Dexterity saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus) or take damage equal to 2d12 plus your Constitution modifier.

</Feat>

<Feat name="Boon of Exquisite Radiance" level={19}
abilityMax={30}
scoreIncrease={2}
abilityIncrease={["Choice"]}
book="hof">

+ _**Eternal Rest.**_ Creatures you reduce to 0 Hit Points can't become Undead.
+ _**Powerful Radiance.**_ When you make a damage roll that deals Radiant damage, you can instead use the highest number possible for each damage die. Once you use this benefit, you can't do so again until you finish a Short Rest.

</Feat>

<Feat name="Boon of Fate" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]}
abilityMax={30}
book="phb">

+ _**Improve Fate.**_ When you or another creature within 60 feet of you succeeds on or fails a D20 Test, you can roll 2d4 and apply the total rolled as a bonus or penalty to the d20 roll. Once you use this benefit, you can't use it again until you roll Initiative or finish a Short or Long Rest.

</Feat>

<Feat name="Boon of Fluid Forms" level={19}
abilityMax={30}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="hof">

+ _**Shapechanger.**_ You can take a Magic action to shape-shift into a Beast, Humanoid, or Monstrosity with a Challenge Rating no higher than 10. When you shape-shift, you gain a number of Temporary Hit Points equal to the Hit Points of the form. The shape-shifting effect lasts for 1 hour, and it ends early if you have no Temporary Hit Points left or if you take a Magic action to return to your true form.

Your game statistics are replaced by the stat block of the chosen form, but you retain your creature type; alignment; personality; Intelligence, Wisdom, and Charisma scores; Hit Points; Hit Point Dice; proficiencies; and ability to communicate. If you have the Spellcasting or Pact Magic feature, you retain it too. Upon shape-shifting, you determine whether your equipment drops to the ground or changes in size and shape to fit the new form while you're in it.

Once you use this benefit, you can't do so again until you finish a Long Rest.

+ _**Hardy Transformation.**_ When you gain Temporary Hit Points when you shape-shift, increase that number of Temporary Hit Points by 20.

</Feat>

<Feat name="Boon of Fortitude" level={19} abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]} abilityMax={30} book="phb">

+ _**Fortified Health.**_ Your Hit Point maximum increases by 40. In addition, whenever you regain Hit Points, you can regain additional Hit Points equal to your Constitution modifier. Once you've regained these additional Hit Points, you can't do so again until the start of your next turn.

</Feat>

<Feat name="Boon of Fortune's Favor" level={19}
abilityIncrease={["Choice"]}
abilityMax={30}
book="hof">

+ _**Saving Throw Reroll.**_ When you fail a saving throw, you can reroll it and must use the new roll. Once you use this benefit, you can't do so again until the start of your next turn.

</Feat>

<Feat name="Boon of High Magic" level={19}
book="echh"
youGain={false}>

You gain one 9th-level spell slot, provided you already have one.

</Feat>

<Feat name="Boon of Invincibility" level={19}
abilityIncrease={["Constitution"]}
abilityMax={30}
book="echh"
youGain={false}>

+ When you take damage from any source, you can reduce that damage to 0. Once you use this boon, you can't use it again until you finish a short rest.

</Feat>

<Feat name="Boon of Irresistable Offense" level={19}
abilityIncrease={["Strength","Dexterity"]}
abilityMax={30}
book="phb">

+ _**Overcome Defenses.**_ The Bludgeoning, Piercing, and Slashing damage you deal always ignores Resistance.
+ _**Overwhelming Strike.**_ When you roll a 20 on the d20 for an attack roll, you can deal extra damage to the target equal to the ability score increased by this feat. The extra damage's type is the same as the attack's type.

</Feat>

<Feat name="Boon of Legendary Actions" level={19}
book="echh"
youGain={false}>

You gain 1 Legendary Action. A Legendary Action can be used at the end of another creature's turn. Spent Legendary Actions are regained at the start of each turn. You can forgo using them, and you can’t use them while Incapacitated or otherwise unable to take actions. If surprised, you can’t use them until after your first turn in combat.

+ _**Attack:**_ You make one Attack.
+ _**Move:**_ You move up to half your speed.
+ _**Cast:**_ You cast a spell with a casting time of a bonus action, or a cantrip with a casting time of one action.

You can take this boon more than once, up to 3 times. Each time you take it after the first, you gain an additional Legendary Action. Only one Legendary Action can be used at a time.

If you have more than 1 Legendary Action, you can spend 2 Legendary Actions to cast a spell up to 5th level with a casting time of one action, or you can spend 3 Legenday Actions to cast a spell up to 9th level with a casting time of one action.

</Feat>

<Feat name="Boon of Magic Wellspring" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
abilityMax={30}
book="echh"
youGain={false}>

+ You regain spell slots levels equal to your proficiency bonus at the end of a short rest

</Feat>

<Feat name="Boon of Poison Mastery" level={19}
abilityIncrease={["Strength","Dexterity","Constitution","Intelligence","Wisdom","Charisma"]}
abilityMax={30}
scoreIncrease={2}
book="hof">

+ _**Antitoxic.**_ You have Immunity to Poison damage and the Poisoned condition.
+ _**Perfect Poisoner.**_ Once per turn, when you roll dice to determine Poison damage a creature takes from your attack, spell, or feature, you can instead use the highest number possible for each die.

</Feat>

<Feat name="Boon of Quick Casting" level={19}
youGain={false}
book="echh"
abilityIncrease={["Intelligence","Wisdom","Charisma"]}
abilityMax={30}>

+ Choose one of your spells of 3rd level or lower that has a casting time of 1 action. That spell’s casting time is now 1 bonus action for you. You can change the chosen spell when you finish a long rest.

</Feat>

<Feat name="Boon of Recovery" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]}
abilityMax={30}
book="phb">

+ _**Last Stand.**_ When you would be reduced to 0 Hit Points, you can drop to 1 Hit Point instead and regain a number of Hit Points equal to half your Hit Point Maximum. Once you use this benefit, you can't use it again until you finish a Long Rest.
+ _**Recover Vitality.**_ You have a pool of ten d10s. As a Bonus Action, you can expend dice from the pool, roll those dice, and regain a number of Hit Points equal to the roll's total. You regain all the expended dice when you finish a Long Rest.

</Feat>

<Feat name="Boon of Resilience" level={19}
abilityIncrease={["Constitution"]}
abilityMax={30}
book="echh"
youGain={false}>

+ You have resistance to bludgeoning, piercing, and slashing damage from non-magical weapons

</Feat>

<Feat name="Boon of Revelry" level={19} abilityIncrease={["Charisma","Wisdom","Intelligence"]} book="hof">

+ _**Inspire Dance.**_ You always have the Otto's Irresistible Dance spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level.

When you cast the spell, it requires no spell components, and taking damage doesn't break your Concentration on it.

+ _**Sing Out.**_ While a creature that failed its saving throw against your Otto's Irresistible Dance has the Charmed condition from that spell, it can't cast spells with Verbal components, and it sings delightful nonsense if it can sing.

</Feat>

<Feat name="Boon of Skill" level={19} abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]} abilityMax={30} book="phb">

+ _**All-Around Adept.**_ You gain proficiency in all skills.
+ _**Expertise.**_ Choose one skill in which you lack Expertise. You gain Expertise in that skill.
+ _**Minor Attunement:**_ You can attune to an additional minor item (common, uncommon or rare item)

</Feat>

<Feat name="Boon of Speed" level={19} abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]} abilityMax={30} book="phb">

+ _**Escape Artist.**_ As a Bonus Action, you can take the Disengage Action, which also ends the Grappled condition on you.
+ _**Quickness.**_ Your Speed increases by 30 feet.

</Feat>

<Feat name="Boon of Spell Lore" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="echh"
youGain={false}>

Your knowledge of spells is expanded.

+ You learn two additional spells from any list. You always have those spells prepared and are considered Class spells for you. You must have a spell slot of the appropriate level or higher.
+ You can attune to an additional minor item (common, uncommon or rare item)

</Feat>

<Feat name="Boon of Spell Mastery"
level={19}
book="echh">

+ _**High Magic.**_ You gain an 8th-level spell slot, provided you already have one

Choose One:
+ _**Potent Spell.**_ Choose one of you 1st-level or 2nd-level spells. The chosen spell must be of instantaneous duration and deal damage. Whenever you cast this spell using a spell slot its damage dice are doubled. You can replace the chosen spell when you level up.
+ _**Supreme Focus.**_ Choose one of your 1st-level and one of your 2nd-level spells. Those spells must require concentration. When you cast one of those spells using a spell slot, you can choose to cast it without concentration. Its duration is reduced to 1 minute unless it's lower. You can replace the chosen spells when you level up.

</Feat>

<Feat name="Boon of Spell Recall" level={19}
abilityIncrease={["Intelligence","Wisdom","Charisma"]}
abilityMax={30}
book="phb">

+ _**Free Casting.**_ Whenever you cast a spell with a level 1-4 spell slot, roll 1d4. If the number you roll is the same as the slot's level, the slot isn't expended.
+ _**Minor Attunement.**_ You can attune to an additional minor item (common, uncommon or rare item)

</Feat>

<Feat name="Boon of Terror" level={19}
abilityIncrease={["Charisma"]}
book="hof">

+ _**Fearless.**_ You have Immunity to the Frightened condition.
+ _**Flee, Fools!**_ When a creature with the Frightened condition starts its turn within 60 feet of you, you can take a Reaction to stoke its terror, provided you can see the creature and it isn't behind Total Cover. If you do so, the creature must succeed on a Wisdom saving throw (DC 8 plus your Charisma modifier and your Proficiency Bonus) or spend its turn moving away from you by the fastest available means. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.
+ _**Intimidating.**_ You gain Proficiency in the Intimidation skill if you don't already have it. You also gain Expertise in Intimidation.

</Feat>

<Feat name="Boon of the Bright Sun" level={19}
abilityIncrease={["Constitution","Charisma","Wisdom"]}
book="hof">

+ _**Daylight Presence.**_ As a Bonus Action, you radiate a 30-foot Emanation of Bright Light that is sunlight. If any of the Emanation's area overlaps with an area of Darkness created by a spell, that spell is dispelled. The Emanation lasts until you dismiss it (no action required), die, or have the Incapacitated condition.
+ _**Fortifying Light.**_ When your Daylight Presence is active, at the start of each of your turns, you and allies you can see in your Daylight Presence gain 10 Temporary Hit Points.

</Feat>

<Feat name="Boon of the Furious Storm" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
abilityMax={30}
book="hof">

+ _**Eye of the Storm.**_ You have Resistance to Lightning and Thunder damage. While you are Bloodied, you have Immunity to Lightning and Thunder damage.
+ _**Storm's Strength.**_ Creatures have Disadvantage on saving throws against your spells that deal Lightning or Thunder damage.

</Feat>

<Feat name="Boon of the Night Spirit" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]}
abilityMax={30}
book="phb">

+ _**Merge with Shadows.**_ While entirely within Dim Light or Darkness, you can give yourself the Invisible condition as a Bonus action. The condition ends on you immediately after you take an action, a Bonus Action, or a Reaction.
+ _**Shadowy Form.**_ While entirely within Dim Light or Darkness, you have Resistance to all damage except Psychic and Radiant.

</Feat>

<Feat name="Boon of Truesight" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence","Dexterity","Strength","Constitution"]}
abilityMax={30}
book="phb">

- _**Truesight**_. You have Truesight with a range of 60 feet.

</Feat>

<Feat name="Boon of the Soul Drinker" level={19}
abilityIncrease={["Choice"]}
abilityMax={30}
book="hof">

+ _**Grave Resistance**_. You have Resistance to Cold damage and Necrotic damage.
+ _**Siphon Life**_. When an enemy within 120 feet of you is reduced to 0 Hit Points, you can take a Reaction to regain 50 Hit Points. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.

</Feat>

<Feat name="Boon of the True Caster" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
abilityMax={30}
book="echh"
youGain="">

You no longer require material components to cast non-epic spells.

Additionally, when you cast a spell that requires material components, the level of the spell is increased by 1 if you provide the required components.

</Feat>

<Feat name="Boon of the Unfettered" level={19}
abilityIncrease={["Strength","Constitution","Dexterity"]}
abilityMax={30}
book="echh"
youGain={false}>

+ You are immune to the grappled, restrained, prone and paralyzed conditions.

</Feat>

<Feat name="Boon of the Warmage" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
abilityMax={30}
book="echh"
>

+ _**Might & Magic:**_ You may add your spellcasting ability modifier to damage rolls of weapon attacks in addition to your strength or dexterity modifier.
+ _**Endurance:**_ Your hit point maximum increases by an amount equal to your character level, and increases by an additional 1 each time you gain a level.

</Feat>

<Feat name="Boon of the Witch" level={19}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
abilityMax={30}
book="echh"
youGain={false}>

The eldritch forces empower you further. You gain 3 eldritch invocations from the warlock Invocation list. You must meet the prerequisites for the chosen invocations, using your character level instead of warlock level for the prerequisites.


</Feat>

<Feat name="Boon of Time Mastery" level={19}
prerequisite="Arcane Spellcasting, the ability to cast 9th level spells"
book="echh"
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
youGain={false}>

+ You learn the Time Stop spell and you always have the spell prepared. You can cast it once without spending a spell slot. Once you cast it this way you cannot cast it again until you finish a long rest.
+ When you cast the Time Stop spell, you roll the number of extra turns twice, taking the highest roll.

</Feat>

<Feat name="Boon of Unlimited Stamina"
level={19}
abilityIncrease={["Constitution"]}
abilityMax={30}
youGain={false}
book="echh">

You are immune to the exhausted condition

</Feat>

## L21: Epic Boons Feats

Can be selected from level 21st onwards.

<FeatTable category="L21" />



<Feat name="Alchamaestro"
level={21}
abilityMax={30}
abilityIncrease={["Constitution","Intelligence"]}
book="echh"
youGain={false}>

Your physiology is well adapted for consuming and enduring the effects of potions, granting you the following benefits.

+ When you would drink a potion as an action, you may instead drink it as a bonus action. When you would drink a potion as a bonus action, you may instead drink it as a free action
+ When the duration of a potion you drink would end, you can choose to concentrate on it (as though concentrating on a spell). If you do so, the potion’s duration continues for as long as you maintain concentration, instead of for its normal duration.
+ During a long rest, you can create a potion of healing for free. If you spend a spell slot and a material component, you instead can create a potion of a rarity show on the Create Potion table

#### Create Potion

| Spell Slot | Material Component | Rarity |
|:-----------:|:-----------:|:-----------:|
| 1-2 | 25 gp | Common |
| 3-4 | 100 gp | Uncommon |
| 5-6 | 250 gp | Rare |
| 7-8 | 1.000 gp | Very Rare |
| 9-Epic 1 | 5.000 gp | Legendary |
| Epic 2 | 20.000 gp | Epic |
| Epic 3 | 50.000 gp | Mythic |

</Feat>

<Feat name="Arcane Insight"
level={21}
abilityMax={30}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="echh">

You understand the nature of magic on nearly every level, which allows you to manipulate and study it with ease.

+ You learn one Divination School spell from a level you can cast. You can cast that spell once without expending a spell slot. Once you have used this feature, until you finish a long rest you cannot cast it again without expending a spell slot of the appropiate level.
+ You have Epic advantage on saving throws against non-Epic and Epic spells as well as non-Epic and Epic magical effects.
+ You automatically identify Non-Epic spells that you can see. Epic spells are identified with a successful Arcana check vs DC 21 for Tier 1 Epic, 25 for Tier 2 Epic and 28 for Tier 3 Epic.
+ When an Epic spell is cast within 1 mile of you or you are within 1 mile of an Epic magical effect, you immediately sense its casting, its presence, and the general direction from which the spell or effect originates. You do not know the nature, power, or effects of the spell you sense, only that Epic magic is being used in the vicinity.

</Feat>

<Feat name="Artifact Affinity"
level={21}
scoreIncrease={2}
book="echh"
abilityMax={30}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}>

Your proficiency with magical equipment and powerful items is remarkable, granting you exceptional understanding and versatility.

+ You can be attuned to an additional magical item at a time. You can attune yourself to any number of magic items over the course of a single short rest, or to a single item by spending 10 continuous minutes handling the item.
+ When you are attuned to a item that have charges, you can use its charges as spells slots for non-epic spells you cast.
+ When you touch a magic item of mythic rarity or lower for the first time, you immediately learn its properties and features.

</Feat>

<Feat name="Blinding Speed"
level={21}
scoreIncrease={2}
abilityMax={30}
abilityIncrease={["Dexterity"]}
youGain={false}
book="echh">

Your speed and reflexes are indescribable, allowing you to move without being perceived.

+ Your movement increased by 30 feet. When you move, you do so with such speed that it appears instantaneous to other creatures, as though you had teleported to where you ended your movement. As a result, your movement does not provoke opportunity attacks and you are heavily obscured while you are moving.
+ When you take the Dash action, you also take the Dodge action.

</Feat>

<Feat name="Boundless Creativity" level={21}
abilityMax={30}
scoreIncrease={2}
abilityIncrease={["Intelligence","Wisdom","Charisma"]}
youGain={false}
book="echh">

Your creative mind is unparalleled, allowing you to solve even the most complex problems with ease.

+ As a bonus action on your turn, you can take the Help, Search, or Use an Object action or the Magic action to cast a spell from an item.
+ You have Epic advantage on Intelligence, Wisdom, and Charisma ability checks.
+ You are proficient in all languages you have encountered. You may learn a new language by spending 8 hours speaking the language with native speakers or studying a work of literature written in the language. Spells with a Vocal component have its DC increased by 1.

</Feat>

<Feat name="Cavalry Master"
level={21}
abilityMax={30}
abilityIncrease={["Strength","Dexterity","Constitution"]}
youGain={false}
book="echh">

Your skill with mounts is legendary.
While you are mounted and not incapacitated, you gain the following benefits.

+ When you score a hit with a weapon attack, the weapon deals an additional 1d10 damage.
+ Your mount has resistance to damage and you have Epic advantage on saving throws and ability checks against effects that would force you to dismount.
+ When you roll for initiative and your mount is intelligent enough to have its own turn, you may choose instead to have your mount act on the same turn as you.

</Feat>

<Feat name="Deadshot"
level={21}
abilityMax={30}
abilityIncrease={["Dexterity"]}
youGain={false}
book="echh">

You are unrivaled in ranged combat, performing feats of sharpshooting that leave others speechless.

+ You can make opportunity attacks using ranged weapons, and creatures provoke opportunity attacks from you when they lose total cover against you.
+ You can make ranged weapon attacks against targets that have total cover from you, provided you know where they are approximately and there is a solid surface within 30 feet of the target that the target does not have total cover from and is within range of your weapon. To make such an attack, you must take a −5 penalty to your attack roll as you ricochet your attack off the solid surface in an attempt to hit the target.
+ When you miss a ranged weapon attack, you learn the AC of your target, and any effects affecting your target AC.

</Feat>

<Feat name="Deathbringer"
level={21}
youGain={false}
book="echh">

You are an unrelenting force of destruction, dealing death with every blow.
+ When you take the Attack action on your turn, you may make an additional weapon attack as a part of that action in addition to any other attacks you would normally make.
+ When you hit a creature with a challenge rating of 5 or lower with a weapon attack, your attacks deal maximum damage.
+ You always know exactly how many creatures you have killed.

</Feat>

<Feat name="Devastating Charger"
level={21}
abilityMax={30}
abilityIncrease={["Strength"]}
youGain={false}
book="echh">

Your charges lay waste to your enemies in battle, driving them back with the ferocity of your blows.

+ On each of your turns, when you take the Dash action for the first time on your turn, you may also take an Attack action. When you take the Attack action granted by this feature, you cannot spend any movement for the remainder of that turn. If you hit with the first attack of your attack action you deal critical damage.
+ When you shove a creature, you may spend 5 or more feet of movement to increase the distance the creature is pushed away from you by 10 feet for every 5 feet of movement spent.
+ When you take the Dash action, every time you spend movement you can shake the ground within 15 feet of you with your footfalls.

</Feat>

<Feat name="Divine Aspect"
level={21}
abilityMax={30}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
youGain={false}
book="echh">

You harness the power of good and evil, which allows you to smite enemies with raw holy or unholy power.

+ You can use your Channel Divinity feature to regain a spell slot up to 5th level.
+ When you deal radiant damage, you may instead do righteous damage, or when you deal necrotic damage, you may instead do vile damage.
+ Your alignment cannot be changed unless you allow it, and you cannot be compelled by non-Deific sources to allow your alignment to be changed.
+ You are aware of the presence of any deities that occupy the same plane as you. You know the deities’ names, alignments, and divine ranks.

</Feat>

<Feat name="Extraordinary Focus"
level={21}
abilityMax={30}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
youGain={false}
book="echh">

You concentrate with precision and discipline even through the most trying of circumstances.

+ You automatically succeed on saving throws to maintain concentration on your spells and other effects.
+ When you become incapacitated and are concentrating on a spell or effect, you may attempt a Constitution saving throw with a DC equal to your spell save DC. On a successful save, you maintain concentration through the duration of your incapacitation.
+ If you are able to be taught a skill, technique, or profession, you can fully learn that skill, technique, or profession in half the usual amount of time required.

</Feat>

<Feat name="Fist of Fury"
level={21}
youGain={false}
book="echh">

Your unarmed strikes land with punishing force, allowing you to destroy both creatures and objects with only your fists.

+ When you damage with your unarmed strike,  add your proficiency bonus to the damage roll.
+ When you kill a creature or destroy an object using your unarmed strikes, you may shatter your target into pieces.
+ Your unarmed strikes deal double damage to objects and structures.

</Feat>

<Feat name="Flawless Instincts"
level={21}
scoreIncrease={2}
youGain={false}
book="echh">

Your senses are always acute and accurate, granting you the following benefits.

+ You always know the DC of a saving throw before you attempt it. You use your reaction to give yourself advantage on a saving throw you attempt.
+ You cannot be surprised, and when initiative is rolled, you may immediately move up to your speed.
+ You instinctively sense if an area is or isn’t safe to rest.

</Feat>

<Feat name="Force of Will"
level={21}
scoreIncrease={2}
abilityMax={30}
abilityIncrease={["Wisdom"]}
book="echh">

Your mind possesses remarkable clarity and strength, which allows you to resist almost any attempt to manipulate you.

+ If you are not unconscious, you are immune to psychic damage, to the effects of the spells that would deal psychic damage, to any effect that would sense your emotions or read your thoughts, to non-Epic divination spells, and to the charmed or frightened conditions.
+ When you attempt a Constitution saving throw, you may attempt a Wisdom saving throw instead (the DC remains the same).
+ If a creature attempts to communicate telepathically with you, you may concentrate (as though concentrating on a spell) to prevent that communication.

</Feat>

<Feat name="Giver of Life"
level={21}
abilityMax={30}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="echh">

You are a master of healing energies, able to restore even the most wounded creature to full strength.

+ When you cause a creature to regain hit points with a feature or spell, you double the amount of hit points regained after all dice (if any) are rolled and modifiers (if any) are applied.
+ When you cause a creature to regain hit points, if that creature has missing body parts (eyes, legs, arms, etc.), you can restore one missing body part.
+ When you cause a creature to regain hit points and that creature isn’t your enemy, that creature becomes friendly toward you.

</Feat>

<Feat name="Immortality"
level={21}
abilityIncrease={["Constitution"]}
youGain={false}
book="echh">

You transcend the limitations of life itself, granting you the following benefits.

+ If you are reduced to 0 hit points, you may use your reaction to drop to 1 hit point instead. As part of the same reaction you may spend one or more of your Hit Dice to recover hit points, always rolling the maximum result on each dice. You can use this feature three times before the end of your next long rest.
+ You no longer suffer from the effects of aging and cannot be magically aged by non-Deific means.
+ Your body and soul cannot be destroyed non-Deific means.

</Feat>

<Feat name="Impenetrable Bulkwark"
level={21}
youGain={false}
book="echh">

Together your armor and shield provide the ultimate defense against your enemies, granting you the following benefits.

+ While you are wearing heavy armor and wielding a shield, when an attack that deals bludgeoning, piercing, slashing or force damage, would deal less damage than (10 + Armor Bonus + Shield Bonus) from a single instance, you instead take no damage from that attack.
+ When you take the attack action, you may give yourself disadvantage on your attacks. When you do so, enemies have Epic disadvantage on attacks against you until the start of your next turn.
+ When you take the Dodge action, you gain the Evasion feature until the start of your next turn.
+ Armor and shields you are wearing are immune to damage from non-Epic sources.

</Feat>

<Feat name="Legendary Potency"
level={21}
youGain={false}
book="echh">

+ When a creature uses legendary resistance or mythic resistance to save against an effect caused by you, you can force that creature to make the saving throw as normal. You can also counterattack a legendary creature that uses a legendary action to attack you, using your reaction to make an attack of opportunity against it.

</Feat>

<Feat name="Legendary Resistance"
level={21}
youGain={false}
book="echh">

+ If you fail a saving throw, you can choose to succeed instead. You can use this ability up to three times, and regain all of your uses whenever you finish a long rest.

</Feat>

<Feat name="Legendary Skills"
level={21}
youGain={false}
book="echh">

You can master techniques and tools with Epic speed, granting you the following benefits.

+ You have 3 legend points. When you finish a long rest, you can spend those legend points to gain proficiency in a single skill or tool of your choice for each legend point spent. If you are already proficient in the skill you choose, you instead double your proficiency bonus for any ability check you attempt that uses the chosen skill. Proficiencies gained through legend points last until you finish a long rest, and you regain spent legend points when you finish a long rest.
+ When you roll a 20 on an ability check in which you are proficient, you automatically succeed on that ability check. If you use any feature other than rolling the d20 to achieve the result, you do not automatically succeed on the ability check.
+ When you expend inspiration or prestige granted by your DM, roll a d20. On a roll of 11 or higher, you instead do not expend your inspiration or prestige but cannot use it again until you finish a long rest

</Feat>

<Feat name="Living Armor"
level={21}
abilityMax={30}
abilityIncrease={["Dexterity","Constitution","Strength"]}
youGain={false}
book="echh">

You are so comfortable in armor it is like a second skin, granting you the following benefits.

+ While you are wearing armor, you no longer have disadvantage on Dexterity (Stealth) ability checks, and armor no longer imposes a weight penalty.
+ While you are wearing armor, your Armor Class increases by 2 and you cannot be critically hit by weapon attacks.
+ As an action, you can don or doff any set of armor.

</Feat>

<Feat name="Lord of War"
level={21}
abilityMax={30}
abilityIncrease={["Dexterity","Constitution","Strength"]}
youGain={false}
book="echh">

Your skill with weapons of war cannot be rivaled, allowing you to wield them with peerless ability.

When you select this feat, choose three different weapon properties from the following table. You gain the corresponding benefits according to which weapon properties you select.

In addition, you become proficient with any weapon you wield after 10 minutes of practice with that weapon and you cannot be disarmed by non-Epic means.

#### Lord of War Weapon Properties

| Weapon Property | Benefits |
|:-----------:|:-----------:|
| Finesse | Melee weapons you wield have the light and finesse properties |
| Heavy | When you score a critical hit on a weapon attack made with a heavy weapon, you can roll one additional weapon damage die when determining the extra damage for a critical hit. |
| Light | Once per turn, when you miss on a weapon attack made with a light weapon, you can instead hit and deal the minimum possible damage on that attack’s damage dice. |
| Loading | When a creature in range of your weapon leaves cover and you are holding a loading weapon, the creature provokes an opportunity attack from you with your loading weapon. |
| Reach | When you score a hit with a weapon with the reach property, you may pull the target 5 feet closer to you or push it 5 feet away from you. |
| Thrown | When you make a weapon attack with a weapon with the thrown property, if you are within 30 feet of your target, you may choose to have that weapon return to your hand immediately after the attack. |
| Two-Handed | You ignore the two-handed requirement of weapons you wield. |

</Feat>

<Feat name="Magical Savant"
level={21}
book="echh">

You have mastered many of the subtleties of spellcasting, increasing the power of your magic considerably.

+ The DC to resist your spells equals 10 + your spellcasting ability modifier + your proficiency bonus + any special modifiers. If you have multiple features that give you different ways to calculate your spell save DC, you choose which one to use.
+ When you cast a spell with a spell slot on a turn, you are no longer limited to casting cantrips that turn. You can cast any number of leveled spells on a turn a as long as your have the required number of actions to do so.

</Feat>

<Feat name="Master of Rituals"
level={21}
scoreIncrease={2}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="echh">

In mere moments you cast spells that others take hours to perform.

+ When you cast a non-Epic spell that is not a ritual with a casting time greater than 1 action, you may instead cast that spell as an action.
+ The casting time for Epic rituals you cast is halved, and and non-Epic rituals require 1 extra minute instead of 10.
+ You instinctively know the local customs and social rituals of communities you encounter.

</Feat>

<Feat name="Master of Tactics"
level={21}
youGain={false}
book="echh">

Your tactical genius allows you to make the most of every advantage, granting you the following benefits.

+ When you have advantage or Epic advantage on an attack roll or ability check, you roll three d20s instead of two. You use the highest of the three rolls to determine the result of the roll.
+ You cannot have disadvantage or Epic disadvantage on attack rolls or ability checks.
+ You are proficient in all games of strategy (chess, go, etc.).

</Feat>

<Feat name="Might-based Spellcasting"
level={21}
abilityIncrease={["Strength"]}
youGain={false}
book="echh">

Your magic becomes enhanced by your physical power, granting you the following benefits.

+ Your spellcasting ability changes to Strength.
+ When you cast a spell with a range of touch, you may make a single weapon attack against your target as a part of casting that spell.
+ You can perform somatic components for spells by flexing your muscles.

</Feat>

<Feat name="Mystic Sage"
level={21}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="echh">

You have delved deeply into the secrets of magic and unearthed untold power.

+ Choose a non-Epic class and Epic prestige class spell list other than your own. Spells on those lists are considered class spells for you. When you would learn a new spell or Epic spell from your lists, you may instead learn one from the lists you chose. Additionally, when you take this feat, you may immediately replace any number of spells you know with  spells from those lists.
+ When you use a spell scroll, roll a d20. On an 11 or higher, the spell scroll is not expended and can be used again.
+ Creatures cannot identify spells you are casting until after they have been cast.

</Feat>

<Feat name="Paragon"
level={21}
youGain={false}>

You are an exemplar to others, gaining the following benefits.

+ Your proficiency bonus is always increased by 1.
+ Choose a saving throw. You gain proficiency in that saving throw. If you are already proficient in the saving throw you choose, whenever you attempt that saving throw and roll a 9 or lower, you instead roll a 10.
+ You can replace one of your non-epic feats with an epic boon of your choice provided you meet the requirements

</Feat>

<Feat name="Perfect Health"
level={21}
abilityMax={30}
abilityIncrease={["Constitution"]}
youGain={false}>

Your body is the pinnacle of physical health, granting you the following benefits.

+ Your hit point maximum increases as though you had rolled the highest possible roll on each of your Hit Dice each time you gained a level, instead of what you had rolled before you selected this feat.
+ At the end of a long rest, you regain all your spent Hit Dice instead of half your total Hit Dice.
+ When you recover hit points by rolling hit dice, you take the maximum result of the roll.
+ You automatically succeed on Constitution ability checks to consume food or drink.

</Feat>

<Feat name="Relentless Warrior"
level={21}
abilityMax={30}
abilityIncrease={["Dexterity"]}
book="echh">

Your attacks are as tenacious as they are deadly, turning the fury of a failed attack into power for your subsequent blows.

+ When you miss on a weapon attack on your turn, you gain a cumulative +5 bonus and +1 to critical range to all subsequent weapon attacks you make until the end of your turn.
+ The targets of your weapon attacks cannot take reactions in response to your weapon attacks.
+ When you are slain, you always die with dignity.

</Feat>

<Feat name="Shadowdancer"
level={21}
abilityMax={30}
abilityIncrease={["Dexterity"]}
book="echh">

You are one with the shadows, an imperceptible, elusive target that cannot be caught.

+ As a reaction to when a creature would hit you with an attack, you can teleport to an obscured area within 30 feet of you.
+ You can attempt to Hide from creatures with blindsight or tremorsense as though they did not have those senses. Additionally, creatures with those senses cannot automatically detect you and instead have Epic advantage on Wisdom (Perception) checks to detect you.
+ You gain devilsight at a range of 120 ft.
+ You can't be detected or targeted by divination magic, including scrying sensors

</Feat>

<Feat name="Sight Beyond Sight" level={21}
abilityMax={30}
abilityIncrease={["Wisdom"]}
youGain={false}>

Your eyesight becomes peerless, granting you the following benefits.

+ As long as you have eyes, you are immune to the blinded condition and you have truesight. You notice secret doors hidden by magic and can see into the ethereal plane, all out to a range of 120 feet.
+ As long as you have line of sight, you can clearly perceive creatures, objects, and structures up to 10 miles away.
+ You have no need to blink your eyes.

</Feat>

<Feat name="Songs of Power" level={21}
book="echh">

Your music and performance know no equal, carrying the power of the music of the creation, resulting in mystical demonstrations of artistry that eclipse all others.

+ As a reaction to when you would make a saving throw or ability check, you may instead make a Charisma (Performance) check to succeed with spectacular flair. The DC remains the same, though it is mysteriously unclear as to how your performance achieved such extraordinary results.

+ While you are not incapacitated, you can take your AC as 10 + your Charisma modifier + your proficiency bonus instead your normal AC calculation.

+ You can flawlessly recount any poem, song, or auditory performance you have ever heard.

</Feat>

<Feat name="Spell Lord" level={21}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}>

Your magic is so powerful as to overwhelm lesser creatures, and your spells strike with greater efficacy.

+ Your spell attacks score a critical hit on a roll of 18–20.
+ When a creature with a challenge rating of 5 or lower succeeds on a saving throw against a spell cast by you, it instead fails.
+ You learn the cantrip arcane mark

</Feat>

<Feat name="Spell Reflection" level={21}>

You can counter others’ magic with ease, turning even the mightiest spells back on their casters.

+ When you cast a spell (such as counterspell or reverse magic, which is detailed in chapter 4) to successfully counter a spell, you may choose to immediately cast that spell using your spellcasting ability, spell save DC, and spell attack bonus without consuming any spell slots or resources normally required to cast that spell. If you do, the spell is countered and the caster spell slot is expended.
+ On each of your turns, you can choose to not take your action that turn. If you do so, you gain the use of an additional reaction until the start of your next turn. This reaction is special and can only be used to cast spells with a casting time of 1 reaction that would attempt to counter a spell (such as counterspell or reverse magic).
+ If you would roll a 9 or lower on an ability check to counter or dispel a spell (such as one made when you cast counterspell or dispel magic), you instead roll a 10.

</Feat>

<Feat name="Spellslinger" level={21}
abilityIncrease={["Charisma","Wisdom","Intelligence"]}
book="echh">

You can sling cantrips with exceptional speed, greatly decreasing their casting time.

+ Cantrips that scale in effect when leveling, scale one additional time at 21st level and another one at 27th level.
+ If you cast a cantrip with a casting time of 1 action, you may cast a second cantrip as part of the same action.
+ When an enemy triggers an attack of opportunity from you, you can cast a cantrip at it as a reaction.
+ You learn three cantrips of your choice from any class spell list, which become class spells for you. If your class does not have a spellcasting ability, you choose which ability (Intelligence, Wisdom, or Charisma) is your spellcasting ability.

</Feat>

<Feat name="Superior Initiative" level={21} book="echh">

You are quick on the draw, able to act before most creatures can even blink.

+ If you would attempt a saving throw at the end of each of your turns to end an effect, you may instead attempt that saving throw at the start of each of your turns.
+ When you roll initiative and at the beginning of each round of combat, you may choose when you act in the initiative order, regardless of your initiative
+ When initiative is rolled, you can immediately ready an action (no action required).

</Feat>

<Feat name="Versatile Mind" level={21} abilityIncrease={["Charisma","Wisdom","Intelligence"]} book="echh">

You are able to focus on multiple tasks simultaneously, diverting your focus precisely and effectively.

+ You can maintain concentration on two spells at once. You do not lose concentration on a spell if you cast a second spell that requires concentration, but you lose concentration on a single spell of your choice on which you are concentrating if you cast a third spell that requires concentration. When you are concentrating on two spells and must attempt a Constitution saving throw to maintain concentration, you must attempt a separate saving throw for each spell.
+ Your spells with a vocal component cannot be countered by non-Epic spells.
+ You may take watch and perform other activities (such as sleeping or crafting) simultaneously.

</Feat>


</FeatBrowser>
