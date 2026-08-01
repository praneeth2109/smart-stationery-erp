export enum Role {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
  INVENTORY_MANAGER = "INVENTORY_MANAGER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum AuditAction {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  LOGIN_FAILED = "LOGIN_FAILED",
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}
