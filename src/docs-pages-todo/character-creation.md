---
description: Character creation selection guide.
tags: [character, character-creation, dnd]
---

import DnDPointBuy from '@site/src/components/DnD/DnDPointBuy';
import StatDiceRoller from '@site/src/components/DnD/StatDiceRoller';

# Character Creation

Follow these steps to create your character:

1. _**Select a Class:**_ Determine your character's primary role and core abilities.
2. _**Choose an Origin:**_ Select a background to define your character's history and starting proficiencies.
3. _**Select a Species:**_ Choose your character's biological heritage.
4. _**Determine Languages:**_ Each character knows at least three languages: Common, a species-specific language, and one additional standard language of your choice.
5. _**Generate Ability Scores:**_ Determine your stats using the Point Buy system, the standard array, or by rolling.

## Standard Array

The standard array for ability scores is: `15, 14, 13, 12, 10, 8`.

## Point Buy System

Use the interactive calculator below to allocate your ability scores using the standard D&D 5e point-buy system:

<DnDPointBuy />

### Point Buy Rules

- You have 27 points to spend on ability scores.
- Each ability score starts at 8.
- You can increase scores up to 15 (before racial bonuses).
- Higher scores cost more points (see cost below each ability).

#### Cost of Ability Scores

| Ability Score | Cost |
|:-------------:|:----:|
| 8             | 0    |
| 9             | 1    |
| 10            | 2    |
| 11            | 3    |
| 12            | 4    |
| 13            | 5    |
| 14            | 7    |
| 15            | 9    |

## Stat Rolling

:::tip Fantasy Grounds
Can use the command: `/die 4d6k3`
:::

<StatDiceRoller />

### Stat Rolling Rules

- Select your class before rolling stats.
- Stats are rolled in order, rolling 4d6 dice and keeping the 3 highest for each stat.
- After that, the player can also swap any Ability Score for another one.

### Mulligan

Players may discard their rolled ability scores and use the Mulligan array instead: `15, 14, 12, 12, 10, 8`.

## Hit points rolling

When leveling up, instead of taking the average value, a character rolls its hit point increase.

The character roll its hit die and makes the following adjustment:

#### Classes rolling d6's or d8's

If the result is odd, round up to the next even number.

:::note[Example]
A roll of 3 on a d6 is rounded up to 4. A roll of 2 remains unchanged.
:::

#### Classes rolling d10's or d12's

Add +1 to the roll. The modified total cannot be higher than the highest value of the dice.

:::note[Example]
E.g. If the player rolls a 6 on a d10, it's increased to 7. If it rolls a 10, the result is unchanged.  
:::
