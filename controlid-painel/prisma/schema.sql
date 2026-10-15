CREATE TABLE IF NOT EXISTS "PanelUser" (
    "id"           TEXT     NOT NULL PRIMARY KEY,
    "email"        TEXT     NOT NULL,
    "passwordHash" TEXT     NOT NULL,
    "name"         TEXT     NOT NULL,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PanelUser_email_key" ON "PanelUser"("email");

CREATE TABLE IF NOT EXISTS "Device" (
    "id"          TEXT     NOT NULL PRIMARY KEY,
    "name"        TEXT     NOT NULL,
    "baseUrl"     TEXT     NOT NULL,
    "login"       TEXT     NOT NULL,
    "passwordEnc" TEXT     NOT NULL,
    "active"      BOOLEAN  NOT NULL DEFAULT true,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "User" (
    "id"           INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceUserId" INTEGER,
    "registration" TEXT     NOT NULL,
    "name"         TEXT     NOT NULL,
    "photoPath"    TEXT,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_deviceUserId_key"  ON "User"("deviceUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_registration_key"  ON "User"("registration");

CREATE TABLE IF NOT EXISTS "DispatchLog" (
    "id"        TEXT     NOT NULL PRIMARY KEY,
    "userId"    INTEGER  NOT NULL,
    "deviceId"  TEXT     NOT NULL,
    "action"    TEXT     NOT NULL,
    "ok"        BOOLEAN  NOT NULL,
    "message"   TEXT     NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DispatchLog_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"   ("id") ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT "DispatchLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AccessEvent" (
    "id"           INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceId"     TEXT     NOT NULL,
    "deviceLogId"  INTEGER  NOT NULL,
    "time"         INTEGER  NOT NULL,
    "event"        INTEGER  NOT NULL,
    "direction"    TEXT     NOT NULL,
    "portalId"     INTEGER,
    "deviceUserId" INTEGER  NOT NULL,
    "userName"     TEXT     NOT NULL,
    "registration" TEXT,
    CONSTRAINT "AccessEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccessEvent_deviceId_deviceLogId_time_key" ON "AccessEvent"("deviceId", "deviceLogId", "time");
CREATE INDEX IF NOT EXISTS "AccessEvent_time_idx" ON "AccessEvent"("time");
CREATE INDEX IF NOT EXISTS "AccessEvent_deviceUserId_time_idx" ON "AccessEvent"("deviceUserId", "time");
