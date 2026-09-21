import type { CharacterData } from '@/utils/parse-character-xml';
import { signed } from '@/utils/format';

type Abilities = CharacterData['abilities'];
type Weapons = CharacterData['weapons'];
type Weapon = Weapons[number];
type WeaponDamage = Weapon['damage'][number];

export interface WeaponRow {
  name: string;
  attack: string;
  properties: string;
  damage: string;
}

function abilityBonus(abilities: Abilities, stat: string): number {
  return abilities[stat]?.bonus ?? 0;
}

function baseAbility(weaponType: number): string {
  return weaponType === 1 ? 'dexterity' : 'strength';
}

function attackTotal(weapon: Weapon, abilities: Abilities, profBonus: number): number {
  const stat =
    weapon.attackstat && weapon.attackstat !== 'base'
      ? weapon.attackstat
      : baseAbility(weapon.type);
  return weapon.attackbonus + profBonus + abilityBonus(abilities, stat);
}

function normalizeDice(dice: string): string {
  const tokens = dice
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length <= 1) return tokens[0] ?? '';
  const groups: Array<{ faces: string; count: number }> = [];
  const passthrough: string[] = [];
  for (const token of tokens) {
    const match = token.match(/^(\d*)d(\d+)$/i);
    if (!match) {
      passthrough.push(token);
      continue;
    }
    const count = match[1] ? Number(match[1]) : 1;
    const faces = match[2];
    const group = groups.find((g) => g.faces === faces);
    if (group) group.count += count;
    else groups.push({ faces, count });
  }
  const combined = groups.map((g) => `${g.count > 1 ? g.count : ''}d${g.faces}`);
  return [...combined, ...passthrough].join('+');
}

function titleCaseDamageType(type: string): string {
  return type
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(', ');
}

function damageTotal(part: WeaponDamage, abilities: Abilities, weaponType: number): string {
  const stat = part.stat === 'base' ? baseAbility(weaponType) : part.stat;
  const statBonus = stat ? abilityBonus(abilities, stat) : 0;
  const modifier = part.bonus + statBonus * part.statmult;
  const dice = normalizeDice(part.dice);
  const head = `${dice}${modifier !== 0 ? signed(modifier) : ''}`;
  const type = titleCaseDamageType(part.type);
  return [head, type].filter(Boolean).join(' ');
}

function damageString(weapon: Weapon, abilities: Abilities): string {
  return weapon.damage
    .map((part) => damageTotal(part, abilities, weapon.type))
    .filter(Boolean)
    .join('; ');
}

export function toWeaponRows(
  weapons: Weapons,
  abilities: Abilities,
  profBonus: number
): WeaponRow[] {
  return weapons
    .filter((weapon) => weapon.carried === 2)
    .map((weapon) => ({
      name: weapon.name,
      attack: signed(attackTotal(weapon, abilities, profBonus)),
      properties: weapon.properties || '-',
      damage: damageString(weapon, abilities),
    }));
}
