import { MANAGER, EMPLOYEE, ADMIN, CLIENT, ADMINUSERS } from "src/base/constants";


export enum Role {
    AdminUsers = ADMINUSERS,
    Admin = ADMIN,
    Manager = MANAGER,
    Employee = EMPLOYEE,
    Client = CLIENT,
}