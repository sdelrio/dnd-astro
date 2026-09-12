---
description: House rules for D&D skills and item attunement.
title: Skills
tags: [skills, attunement, dnd]
---

## Rolling skill checks without proficiency 

There are some skills which require knowledge or practice which is very specialized (somebody without previous training cannot seriously play a violin or know arcane lore without having studied it before).  
The following skils fall into this category, and cannot be rolled without proficiency:  
- **Arcana, History, Medicine, Nature, Performance, Religion, Play Instrument and almost all tools**.  
- **Thieves' Tools** can be used with **Sleight of Hand** without adding the proficiency bonus.


## Attunement

You can attune to an item during a short or long rest.  
Attuning to a item requires a number of successful checks depending on item rarity, as indicated the table below.

> The DC of this check is 15.

The character must achieve a specific number of consecutive successes. To resolve the attempt, perform either an **Arcana check** or a check using your **spellcasting ability modifier plus your proficiency bonus**.

### Overchanneling Attunement

If an initial attunement roll fails, you may choose to Commit All Energies. Doing so guarantees eventual attunement but carries a risk of physical collapse.

#### The Procedure

1. **Resolve Successes**: Continue rolling until the required number of successes is met.
2. **Calculate Penalties**: Total the number of failures accrued during the process.
3. **Endurance Check**: For each failure, perform a CON Saving Throw against the item’s CON Save DC.
4. **Failure**: Gain one level of exhaustion.
5. **Critical Exhaustion**: If your exhaustion exceeds level 5, perform a WIS Saving Throw against the item's CON Save DC.
6. **Success**: You break the item's influence and stabilize at level 5 exhaustion.
7. **Failure**: You succumb to the item (Death by Exhaustion).
8. **Recovery**: Exhaustion gained through this process is specialized. It is removed entirely by a single casting of Greater Restoration or a completed Long Rest. This specific exhaustion must be fully cleared before any exhaustion from other sources can be reduced.

| Item Rarity | Successes required | CON SAVE DC |
|:-----------:|:--------------:|:--------------:|
| Common | Automatic | - |
| Uncommon | 2 | 10 |
| Rare | 3 | 12 |
| Very Rare | 4 | 15 |
| Legendary | 4 | 18 |
| Artifact | 5 | 20 |

## Foraging for Ingredients

After completing a foraging period, perform a **Wisdom (Survival)** check against the **Biome DC**. On a success, the character recovers a quantity of raw materials suitable for use with an **Herbalism Kit** or **Poisoner’s Kit**.

### Calculate value of gathered ingredients

**Yield Calculation:** The total value of gathered ingredients is determined by the following formula:

> 5 gp + (1 gp * Margin of Success)

The *"Margin of Success"* is the difference between the check result and the Biome DC.

**Rare Finds**: If the final check result is 25 or higher, the character discovers a **Rare Ingredient** in addition to the standard yield. Consult the **Rare Ingredient Value Table** below to determine its specific properties and worth.

#### Rare Ingredient Value Table

| Biome | Survival DC | Rare Ingredient (25+) |
|:-----------:|:--------------:|:--------------:|
| Plains | 10 | 25 gp |
| Hills | 15 | 50 gp |
| Mountains | 20 | 100 gp |
| Riverside | 10 | 30 gp |
| Coast | 15 | 25 gp |
| Desert | 20 | 100 gp |
| Jungle | 10 | 100 gp |
| Conifererous Forest | 18 | 50 gp |
| Decidious Forest | 10 | 50 gp |
| Tundra | 20 | 100 gp |
| Marsh | 12 | 75 gp |
| Badlands | 18 | 50 gp |
| Underground | 15 | 75 gp |



## Crafting

***PHB 233***

:::note Crafting Time
Crafting non-magical items takes a number of workdays (8h/day) equal to: `The purchase price of the item / 10`
Another character can combine its efforts halving the crafting time and but It must be proficient with the required tools.
:::


:::note Raw Materials
To make an item, you need raw materials worth half the purchase cost of the item (rounded down). The DM determines wheter the appropiate raw materials are available.
:::

Failing the crafting roll doesn't mean the effort is wasted. The crafter may simply need extra time and resources to finish the item. Determine the margin of failure and check the table below:

| Margin of Failure | Result | 
|:-----------:|:--------------:
| 1 | Add +10% cost in raw materials |
| 2 | Add +10% cost in raw materials and take 50% extra time or an extra day, whichever is lower |
| 3-4 | Add +25% cost in raw materials and take 50% extra time or 2 extra days, whichever is lower |
| 5 | Add +25% cost in raw materials and take 50% extra time or 1 extra day, whichever is higher |
| 6+ or natural 1 | Total failure. Materials and work are hopelessly wasted |



### Brewer's Supplies (Intelligence)

**Utilize:** Detect poisoned drink (DC 15), or identify alcohol (DC 10)

| Craft     | Materials Cost          | Workday |
| :-------- | :---------------------: | :-----: |
| Antitoxin | 25 gp                   | 1       |
| Beer      | 1 gp/gallon             | 1       |

### Carpenter's Tools (Strength)

**Utilize:** Seal or pry open a door or container (DC 20)

| Craft          | Materials Cost      | Workday                     | Difficulty Class |
| :------------- | :------------------ | :-------------------------- | :--------------- |
| Club           | 0 gp                | 1                           | Automatic Success|
| Greatclub      | 1 sp                | 1                           | DC 10            |
| Quarterstaff   | 1 sp                | 1                           | DC 10            |
| Barrel         | 1 gp                | 1                           | DC 15            |
| Chest          | 25 sp               | 1                           | DC 15            |
| Ladder         | 1 sp                | 1                           | DC 15            |
| Pole           | 0 gp                | 1                           | Automatic Success|
| Portable Ram   | 2 gp                | 1                           | DC 10            |
| Torch          | 1 sp per 10 torches | 1 (per 10 torches)          | Automatic Success|
| Shield         | 5 gp                | 1                           | DC 15            |

### Cartographer's Tools (Wisdom)

**Utilize:** Draw a map of a small area (DC 15)

| Craft | Materials Cost | Workday | Difficulty Class  |
| :---- | :------------- | :------ | :---------------- |
| Map   | 5 sp           | 1       | Automatic Success |

### Cobbler's Tools (Dexterity)

**Utilize:** Modify footwear to better adapt to terrain (DC 10)

| Craft           | Materials Cost | Workday | Difficulty Class |
| :-------------- | :------------- | :------ | :--------------- |
| Climber's Kit   | 125 sp         | 3       | DC 10            |

### Cook's Utensils (Wisdom)

**Utilize:** Improve food flavor (DC 10), detect spoiled or poisoned food (DC 15)

| Craft   | Materials Cost           | Workday                  | Difficulty Class |
| :------ | :----------------------- | :----------------------- | :--------------- |
| Rations | 2 sp per ration          | 1 (for every 20 rations) | DC 10            |

### Glassblower's Tools (Intelligence)

**Utilize:** Discern what a glass object held in the past 24 hours (DC 15)

| Craft           | Materials Cost | Workday | Difficulty Class |
| :-------------- | :------------- | :------ | :--------------- |
| Glass Bottle    | 1 gp           | 1       | Automatic Success|
| Magnifying Glass| 50 gp          | 10      | DC 10            |
| Spyglass        | 500 gp         | 100     | DC 15            |
| Vial            | 5 sp           | 1       | Automatic Success|

### Jeweler's Tools (Intelligence)

**Utilize:** Discern treasure value by worth of materials and craftmanship (DC 15).

| Craft         | Materials Cost    | Workday      | Difficulty Class |
| :------------ | :---------------- | :----------- | :--------------- |
| Arcane focus  | 25 sp to 10 gp    | 1-2          | DC 15            |
| Holy symbol   | 25 sp             | 1            | DC 10            |

### Leatherworker's Tools (Dexterity)

**Utilize:** Add a custom design to a leather item, make a pouch (DC 10)

| Craft                 | Materials Cost          | Workday                    | Difficulty Class     |
| :-------------------- | :---------------------- | :------------------------- | :------------------- |
| Sling                 | 1 sp                    | 1                          | Automatic Success |
| Whip                  | 1 gp                    | 1                          | DC 15                |
| Hide Armor            | 5 gp                    | 1                          | DC 10                |
| Leather Armor         | 5 gp                    | 1                          | DC 10                |
| Studded Leather Armor | 225 sp                  | 5                          | DC 15                |
| Backpack              | 1 gp                    | 1                          | DC 15                |
| Quiver                | 5 sp                    | 1                          | DC 10                |
| Map or Scroll Case    | 5 sp                    | 1                          | DC 10                |
| Parchment             | 1 sp per 10 parchments  | 1 (for every 10 parchments)| Automatic Success |
| Waterskin             | 1 sp                    | 1                          | DC 10                |

### Mason's Tools (Strength)

**Utilize:** Chisel a symbol or hole in stone (DC 10)

| Craft           | Materials Cost | Workday | Difficulty Class |
| :-------------- | :------------- | :------ | :--------------- |
| Block and Tackle| 5 sp           | 1       | DC 10            |

### Painter's Tools (Wisdom)

**Utilize:** Paint a recognizable image of something

| Craft         | Materials Cost  | Workday | Difficulty Class |
| :------------ | :-------------- | :------ | :--------------- |
| Holy symbol   | 25 sp           | 1       | DC 10            |
| Druidic focus | 5 sp to 5 gp    | 1       | DC 15            |

### Potter's Tools (Intelligence)

**Utilize:** Discern what a ceramic object held in the past 24 hours (DC 15)

| Craft | Materials Cost | Workday | Difficulty Class  |
| :---- | :------------- | :------ | :-----------------|
| Jug   | 0 sp           | 1       | Automatic Success |
| Lamp  | 2 sp           | 1       | DC 10             |

### Smith's Tools (Strength)

**Utilize:** Pry open a door or container (DC 20)

| Craft                   | Materials Cost          | Workday                      | Difficulty Class  |
| :---------------------- | :---------------------- | :--------------------------- | :---------------- |
| Dagger, Light Hammer    | 1 gp                    | 1                            | DC 10             |
| Handaxe, Mace, Pike, Trident, War Pick | 25 sp    | 1                            | DC 12             |
| Javelin, Dart (10)      | 2 sp                    | 1                            | DC 10             |
| Sickle, Spear           | 5 sp                    | 1                            | DC 10             |
| Battleaxe, Flail, Lance, Maul, Shortsword | 5 gp  | 1                            | DC 15             |
| Glaive, Halberd         | 10 gp                   | 2                            | DC 15             |
| Longsword, Morningstar, Warhammer | 75 sp         | 2                            | DC 15             |
| Greataxe                | 15 gp                   | 3                            | DC 18             |
| Rapier, Scimitar        | 125 sp                  | 3                            | DC 18             |
| Greatsword              | 25 gp                   | 5                            | DC 20             |
| Chain Shirt, Scale Mail | 25 gp                   | 5                            | DC 12             |
| Breastplate             | 200 gp                  | 40                           | DC 18             |
| Half-Plate              | 375 gp                  | 75                           | DC 20             |
| Ring Mail               | 15 gp                   | 3                            | DC 10             |
| Chain Mail              | 37 gp                   | 8                            | DC 12             |
| Splint Armor            | 100 gp                  | 20                           | DC 15             |
| Plate Armor             | 750 gp                  | 150                          | DC 20             |
| Ball bearings           | 5 sp                    | 1                            | Automatic Success |
| Bucket                  | 0 sp                    | 1                            | DC 10             |
| Caltrops                | 5 sp                    | 1                            | Automatic Success |
| Chain                   | 25 sp                   | 1                            | Automatic Success |
| Crowbar                 | 1 gp                    | 1                            | DC 10             |
| Firearm Bullets         | 15 sp                   | 1                            | Automatic Success |
| Grappling Hook          | 1 gp                    | 1                            | DC 12             |
| Iron Pot                | 1 gp                    | 1                            | DC 10             |
| Iron Spikes             | 5 sp                    | 1                            | Automatic Success |
| Sling Bullets           | 0 gp                    | 1                            | Automatic Success |


### Tinker's Tools (Dexterity)

**Utilize:** Assemble a tiny item from scraps (DC 20)

| Craft           | Materials Cost | Workday | Difficulty Class  |
| :-------------- | :------------- | :------ | :---------------- |
| Musket          | 250 gp         | 50      | DC 20             |
| Pistol          | 125 gp         | 25      | DC 20             |
| Bell            | 5 sp           | 1       | DC 10             |
| Bullseye Lantern| 5 gp           | 1       | DC 12             |
| Flask           | 5 gp           | 1       | DC 15             |
| Hooded Lantern  | 25 sp          | 1       | DC 10             |
| Hunting Trap    | 25 sp          | 1       | DC 12             |
| Lock            | 5 gp           | 1       | DC 15             |
| Manacles        | 1 gp           | 1       | DC 12             |
| Mirror          | 25 sp          | 1       | DC 10             |
| Shovel          | 1 gp           | 1       | DC 10             |
| Signal Whistle  | 0 gp           | 1       | Automatic Success |
| Tinderbox       | 2 sp           | 1       | Automatic Success |

### Weaver's Tools (Dexterity)

**Utilize:** Mend a tear in clothing (DC 10). Sew a tiny design (DC 10).

| Craft             | Materials Cost | Workday | Difficulty Class  |
| :---------------- | :------------- | :------ | :---------------- |
| Padded Armor      | 25 sp          | 1       | DC 10             |
| Basket            | 2 sp           | 1       | DC 10             |
| Bedroll           | 5 sp           | 1       | DC 10             |
| Blanket           | 2 sp           | 1       | Automatic Success |
| Fine Clothes      | 75 sp          | 2       | DC 20             |
| Net               | 5 sp           | 1       | DC 12             |
| Robe              | 5 sp           | 1       | DC 10             |
| Rope              | 5 sp           | 1       | DC 12             |
| Sack              | 0 gp           | 1       | Automatic Success |
| String            | 1 sp           | 1       | Automatic Success |
| Tent              | 1 gp           | 1       | DC 15             |
| Traveler's Clothes| 1 gp           | 1       | DC 15             |

### Woodcarver's Tools (Dexterity)

**Utilize:** Carve a pattern in wood (DC 10)

| Craft             | Materials Cost            | Workday                  | Difficulty Class  |
| :---------------- | :------------------------ | :----------------------- | :---------------- |
| Club              | 0 gp                      | 1                        | Automatic Success |
| Greatclub         | 1 sp                      | 1                        | DC 10             |
| Quarterstaff      | 1 sp                      | 1                        | DC 10             |
| Shortbow, Light Crossbow | 125 sp             | 3                        | DC 15             |
| Longbow, Heavy Crossbow | 25 gp               | 5                        | DC 18             |
| Hand Crossbow     | 375 sp                    | 8                        | DC 20             |
| Arcane focus      | 25 sp to 10 gp            | 1-2                      | DC 15             |
| Druidic focus     | 5 sp to 5 gp              | 1                        | DC 15             |
| Arrows (20) or Bolts (20) | 5 sp per 20 arrows/bolts  | 1 (per 20 arrows/bolts)  | DC 10     |
| Shield            | 5 gp                      | 1                        | DC 15             |

## The Advanced Tools

The tools in this chapter allow to craft magical items, such as potions, poisons and spell scrolls.


### Herbalism Kit (Intelligence)

:::note Potions Crafting Time
Crafting potions takes a number of workdays (8h/day) equal to: `The purchase price of the item / 50`
Another character can combine its efforts halving the crafting time and but It must be proficient with the required tools.
:::

:::note Raw Materials
To make an item, you need raw materials worth half the purchase cost of the item (rounded down). The DM determines wheter the appropiate raw materials are available. 
:::


**Utilize:** Identify a plant (DC 10)

| Craft                    | Materials Cost          | Workday                  | Difficulty Class                               |
| :----------------------- | :---------------------- | :----------------------- | :--------------------------------------------- |
| Antitoxin                | 25 gp                   | 1                        | DC 10 (Automatic Success if proficient in Nature) |
| Candle                   | 0 sp                    | 1 (per 10 candles)       | Automatic Success                              |
| Healer's Kit             | 25 sp                   | 1                        | DC 10                                          |
| Potion of Healing        | 25 gp                   | 1                        | DC 10 (Automatic Success if proficient in Nature) |
| Potion of Greater Healing| 75 gp                   | 3                        | DC 15 (DC 10 if proficient in Nature)          |
| Potion of Superior Healing| 375 gp                 | 15                       | DC 20 (DC 15 if proficient in Nature)          |
| Potion of Supreme Healing| 750 gp                  | 30                       | DC 25 (DC 20 if proficient in Nature)          |
| Keogthom Ointment        | 80 gp                   | 3                        | DC 15 (DC 10 if proficient in Nature)          |
| Herbal Healing Poultice  | 50 gp                   | 2                        | DC 12 (DC 10 if proficient in Nature)          |
| Herbal Tonic             | 25 gp                   | 1                        | Automatic Success                              |
| Potion of Stamina        | 50 gp                   | 2                        | DC 12                                          |
| Potion of Greater Stamina| 125 gp                  | 5                        | DC 15                                          |
| Other                    | Varies                  | -                        | -                                              |

### Poisoner's Kit (Intelligence)

:::note Poisons Crafting Time
Crafting poisons takes a number of workdays (8h/day) equal to: `The purchase price of the item / 100`
Another character can combine its efforts halving the crafting time and but It must be proficient with the required tools.
:::

:::note Raw Materials
To make an item, you need raw materials worth half the purchase cost of the item (rounded down). The DM determines wheter the appropiate raw materials are available. 
:::


**Utilize:** Detect a poisoned object (DC 10)

| Craft               | Materials Cost  | Workday | Difficulty Class                            |
| :------------------ | :-------------- | :------ | :------------------------------------------ |
| Antitoxin           | 25 gp           | 1       | DC 10 (Automatic success if proficient in Nature) |
| Basic Poison        | 50 gp           | 1       | DC 10 (Automatic success if proficient in Nature) |
| Drow Poison         | 100 gp          | 2       | DC 15                                       |
| Belladona           | 225 gp          | 5       | DC 15 (DC 10 if proficient in Nature)       |
| Bloodstinger Poison | 50 gp           | 1       | DC 10 (Automatic Success if proficient in Nature) |
| Purple Worm Poison  | 1,000 gp        | 20      | DC 20 (DC 15 if proficient in Nature)       |
| Wyvern Poison       | 680 gp          | 12      | DC 18 (DC 12 if proficient in Nature)       |
| Othur Mold Spores   | 225 gp          | 5       | DC 15 (DC 10 if proficient in Nature)       |
| Serpent Venom       | 35 gp           | 1       | DC 10 (Automatic success if proficient in Nature) |
| Pale Tincture       | 325 gp          | 7       | DC 15                                       |

### Calligrapher's Supplies (Dexterity)

**Utilize:** Write a text with impressive flourishes that guard against forgery (DC 15)

| Craft       | Materials Cost | Workday | Difficulty Class                                   |
| :---------- | :------------- | :------ | :------------------------------------------------- |
| Ink         | 5 gp           | 1       | Automatic Success                                  |
| Magic Inks  | Varies         | 1       | DC 10 (Automatic success if proficient in Arcana or Religion) |
| Spell Scroll| See table below| -       | -                                                  |

#### Crafting Spell Scrolls

A spellcaster can transfer a spell to a scroll and create a *Spell Scroll*.

:::info
The scroll's spell uses the unmodified Spell Save DC or Spell Attack Bonus of the scroll creator. If the inscribed scroll is a cantrip, the cantrip is cast as if the caster were the spell's creator level.
:::

:::note Create Spell Scroll DC
The DC for inscribing a scroll is 10 + spell level
:::


**PREREQUISITES FOR THE SCRIBE**
+ To scribe an arcane spell scroll, you must have proficiency in the Arcana skill. If you also have proficiency in Calligrapher's supplies the check is automatically successful.
+ To scribe a divine spell scroll, you must have proficicency in the Religion skill. If you also have proficiency in Calligrapher's supplies the check is automatically successful.

You must have the spell prepared in each day of the inscription, and you must also have at hand any Material Component required by the spell;

:::info
If the spell consumes its Material Components, they are consumed only when you complete the scroll.
:::

**SPELL SCROLL COSTS**

| Spell Level | Time | Cost | Difficulty Class |
|:-----------:|:--------------:|:--------------:|:--------------:|
| Cantrip | 1 workday | 10 GP | DC 10 |
| 1st | 1 workday | 20 GP | DC 11 |
| 2nd | 3 workdays | 75 GP | DC 12 | 
| 3rd | 5 workdays | 200 GP | DC 13 |
| 4th | 10 workdays | 350 GP | DC 14 |
| 5th | 25 workdays | 600 GP | DC 15 | 
| 6th | 40 workdays | 1.250 GP | DC 16 | 
| 7th | 50 workdays | 2.500 GP | DC 17 | 
| 8th | 60 workdays | 5.000 GP | DC 18 | 
| 9th | 120 workdays | 12.500 GP | DC 19 | 


### Alchemist's Supplies (Intelligence)

:::note Alchemical Potions Crafting Time
Crafting time depends on the potion rarity. See the Alchemy Crafting Table Below. Time is in workdays of 8 hours.
Another character can combine its efforts halving the crafting time and but It must be proficient with the required tools.
:::

:::note Raw Materials
To make an item, you need three things: An Alchemical Base, a Suitable Reagent and an Appropiated Spell
:::


**Utilize:** Identify a substance (DC 15), or start a fire (DC 15)

#### Basic Alchemical Crafting

| Craft              | Materials Cost       | Workday                | Difficulty Class  |
| :----------------- | :------------------- | :--------------------- | :---------------- |
| Acid               | 125 sp               | 1                      | DC 10             |
| Alchemist's Fire   | 25 gp                | 1                      | DC 12             |
| Component's Pouch  | 125 sp               | 1                      | DC 10             |
| Oil                | 1 sp                 | 1                      | Automatic Success |
| Paper              | 1 sp per 10 sheets   | 1 (per 10 sheets)      | Automatic Success |
| Perfume            | 25 sp                | 1                      | DC 10             |

#### Alchemical Potions

Alchemical potions contain spells, mimic the effects of spells or have an effect out of the scope of normal spells, such as a Potion of Giant Strength. 
Brewing this kind of potions is a process full of danger and ingenuity. The act of creating these magic items is called alchemy, and those who hone this craft are often alchemist artificers, wizards, or similarly intelligent specialists with an affinity for chemistry.  

Magic is not a cooperative energy and doesn’t appreciate being forced into a tiny bottle for consumption. Despite the best efforts of countless crafters, the process of brewing potions has never been successfully automated, with any attempt leading to catastrophic results. Brewers must slave over their work, watching for a sign of things about to go terribly wrong. The difficulty and time required to complete this process is determined by the potion’s rarity.

:::info
A series of successful Intelligence ability checks (typically three) is required to complete this process, along with an extended waiting period while the potion brews.
:::

The nature of the ability checks represents the 3 steps necessary to complete the process: The creation of the Potion’s base, the addition of the bonding agent and the infusion of magic into the potion.
At minimum this requires a set of alchemist’s supplies, but many experienced crafters use something far more elaborate and safer laboratories, with specialized equipment to make this checks easier.

:::danger
Additionally, when a creature attempting to brew a potion fails an Intelligence ability check by 10 or more, the potion explodes catastrophically, destroying any tools or equipment that were being used to create it.
:::

Finally, an alchemist crafting a potion must acquire specific and potent ingredients. These components are used in various stages of the brewing process, forming the potion’s base and bonding agent, the details of which follow. Note that these do not encompass all the ingredients required to create a potion, merely the most significant ones.
The difficulty DC and time required to brew a potion according to its rarity are detailed in the Alchemy Crafting table.


**ALCHEMICAL CRAFTING TABLE**

| Rarity    | Ability Check DC | Brewing Time[^1]| Minimum CR for reagent | Potion Spell Level |
| :-------: | :--------------: | :-------------: | :--------------------: | :----------------: |
| Common    | DC 12            | 0.5             | < CR 1                 | Cantrip            |
| Uncommon  | DC 14            | 1               | CR 1-3                 | 1st-2nd            |
| Rare      | DC 17            | 7               | CR 4-9                 | 3rd-4th            |
| Very Rare | DC 20            | 14              | CR 10-16               | 5th-6th            |
| Legendary | DC 25            | 30              | CR 17-22               | 7th-8th            |
| Epic      | DC 30            | 90              | CR 23+                 | 9th-Epic 1st       |
| Mythic    | DC 35            | 180             | Mythic                 | Epic 2nd-Epic 3rd  |

[^1]: Elixirs require twice this time

:::note
Elixirs require twice the preparation time.
:::

##### STEP 1 - ALCHEMICAL BASE

Making a potion with ordinary water is a literal recipe for disaster.
Mystical fluids with strange properties are far more effective. Rarer potions require bases that are incredibly dangerous, expensive, or both.
The blood of a troll, a compound synthesized through transmutation magic, or the rain from a magic-soaked world are all examples of appropriate bases for brewing potions.
When crafting potions, the first Intelligence ability check performed should be themed around preparing or synthesizing this alchemical base.

:::info
At the end of this process roll and Alchemist's supplies or Brewer's supplies tool check
:::

##### STEP 2 - BONDING REAGENT

Binding magic to an alchemical base requires a potent agent through which the magic will flow.
These bonding agents are often harvested from magical creatures and are consumed in the process of brewing the potion. The school of magic that best fits the potion’s magical effect determines what kind of creature a bonding agent must be harvested from, as detailed in the Bonding Agent Harvesting table.
Additionally, the rarity of the potion determines of strength of the creature from which the bonding agent must be harvested.

:::info
At the end of this process roll and Alchemist's supplies tool check
:::

**BONDING AGENT HARVESTING**

| Magical Effect Affinity | Creature Type|
|:-----------:|:--------------:|
| Abjuration | Construct, Monstrosity, Plant, Celestial |
| Conjuration | Elemental, Fiend, Celestial, Aberration |
| Divination | Celestial, Beast, Plant, Undead |
| Enchantment | Fiend, Fey, Plant, Aberration |
| Evocation | Dragon, Elemental, Ooze, Giant |
| Illusion | Fey, Elemental, Aberration, Fiend |
| Necromancy | Undead, Fiend, Aberration, Monstrosity |
| Transmutation | Ooze, Aberration, Monstrosity, Dragon |


##### STEP 3 - MAGIC INFUSION

The last step of alchemy is infusing magic to the base + reagent. The alchemist must cast a spell of the same level as the potion spell level and it must be from the school of magic the reagent has affinity for.

:::info
At the end of this process roll and Alchemist's supplies tool check or Arcana skill check
:::

## Other Tools

### Disguise Kit (Charisma)

**Utilize:** Apply makeup (DC 10)

**Craft:** 
+ Costume (varies)

### Forgery Kit (Dexterity)

**Utilize:** Mimic 10 or fewer words of someone else's handwritting (DC 15), or duplicate a wax seal (DC 20)

### Gaming Set (Wisdom)

**Utilize:** Discern whether someone is cheating (DC 10) or win the game (DC 20).


### Musical Instrument (Charisma)

**Utilize:** Play a known tune (DC 10) or improvise a song (DC 15)

### Navigator's Tools (Wisdom)

**Utilize:** Plot a course (DC 10) or determine position by stargazing (DC 15)

### Thieves' Tools (Dexterity)

**Utilize:** Open locks or disarm traps (DC varies)

