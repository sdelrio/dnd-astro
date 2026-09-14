import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCharacterXML, CharacterData } from './parse-character-xml';

describe('parseCharacterXML', () => {
  it('parses draknor.xml correctly', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result).not.toBeNull();
    // Add minimal essential field checks (expand assert coverage in later cycles)
    expect(result?.name).toBeDefined();
    expect(result?.classes.length).toBeGreaterThan(0);
  });

  it('captures save proficiency flags for proficient-only saving throws', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.abilities?.strength?.saveprof).toBe(1);
    expect(result?.abilities?.constitution?.saveprof).toBe(1);
    expect(result?.abilities?.dexterity?.saveprof).toBe(0);
  });

  it('parses direct-child powers from id-keyed collections', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.powers.length).toBeGreaterThan(0);
    const secondWind = result?.powers.find((p) => p.name === 'Second Wind');
    expect(secondWind).toBeDefined();
    expect(secondWind?.group).toContain('Fighter');
  });

  it('exposes flat vitals and skill totals per SPEC-003', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/draknor.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result?.ac).toBeGreaterThan(0);
    expect(result?.hp).toBeGreaterThan(0);
    for (const skill of result?.skills ?? []) {
      expect(skill.total).toBeDefined();
    }
  });

  it('parses elarion.xml correctly & yields multiclass info', () => {
    const xml = readFileSync(join(__dirname, '../assets/fantasy-grounds-sheets/elarion.xml'), 'utf8');
    const result = parseCharacterXML(xml);
    expect(result).not.toBeNull();
    expect(result?.classes.length).toBe(1); // only 1 class present in input
    expect(result?.classes[0].name.toLowerCase()).toContain('warlock');
  });

  it('returns null if no <character> node', () => {
    const xml = `<root><foo>bar</foo></root>`;
    const result = parseCharacterXML(xml);
    expect(result).toBeNull();
  });
});
