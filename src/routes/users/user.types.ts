export enum UserRoles {
    Gost = 'gost',
    Vlasnik = 'vlasnik',
    Admin = 'admin'
}

export const UserRolesValues = Object.values(UserRoles) as [string, ...string[]];