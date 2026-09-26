import { ROLE_CONFIG, type Role } from './party-roster';

export interface PartyViewComponent {
  $el: { dataset: Record<string, string | undefined> };
  allRoles: Role[];
  roleConfig: Record<Role, (typeof ROLE_CONFIG)[Role]>;
  memberCount: number;
  memberRoles: Role[][];
  activeRoles: Role[];
  init(): void;
  toggleRole(role: Role): void;
  isRoleActive(role: Role): boolean;
  hasActiveRole(roles: Role[]): boolean;
  statusMessage(): string;
}

/**
 * Registered with `Alpine.data('partyView', ...)`. This used to be an
 * `is:inline` script assigning `window.partyView`, read the root element's
 * dataset through a `$el` argument, and had no way to be type checked.
 */
export function partyViewComponent(): PartyViewComponent {
  return {
    $el: { dataset: {} },
    allRoles: [],
    roleConfig: {} as PartyViewComponent['roleConfig'],
    memberCount: 0,
    memberRoles: [],
    activeRoles: [],
    init() {
      this.allRoles = JSON.parse(this.$el.dataset.allRoles ?? '[]') as Role[];
      this.roleConfig = JSON.parse(
        this.$el.dataset.roleConfig ?? '{}'
      ) as PartyViewComponent['roleConfig'];
      this.memberCount = Number(this.$el.dataset.memberCount ?? 0);
      this.memberRoles = JSON.parse(this.$el.dataset.memberRoles ?? '[]') as Role[][];
      this.activeRoles = [...this.allRoles];
    },
    toggleRole(role: Role) {
      if (this.activeRoles.includes(role)) {
        this.activeRoles = this.activeRoles.filter((r) => r !== role);
      } else {
        this.activeRoles.push(role);
      }
    },
    isRoleActive(role: Role) {
      return this.activeRoles.includes(role);
    },
    hasActiveRole(roles: Role[]) {
      return roles.some((role) => this.isRoleActive(role));
    },
    /**
     * Announced after every filter change. Pure on purpose: assigning to
     * reactive state from inside an `x-text` expression re-triggers the
     * effect that called it.
     */
    statusMessage() {
      const total = this.memberCount;
      const visible = this.memberRoles.filter((roles) => this.hasActiveRole(roles)).length;
      if (this.activeRoles.length === this.allRoles.length) {
        return `Filter: all roles. ${visible} members shown.`;
      }
      if (this.activeRoles.length === 0) {
        return `Filter: no roles. 0 of ${total} members shown.`;
      }
      const names = this.activeRoles.map((r) => this.roleConfig[r].label).join(', ');
      return `Filter: ${names}. ${visible} of ${total} members shown.`;
    },
  };
}
