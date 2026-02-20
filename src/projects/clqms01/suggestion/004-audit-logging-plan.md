---
layout: clqms-post.njk
tags: clqms
title: "Audit Logging Architecture Plan"
description: "Comprehensive audit trail implementation based on 5W1H principles across four specialized log types"
date: 2026-02-20
order: 4
---

# Audit Logging Architecture Plan for CLQMS

> **Clinical Laboratory Quality Management System (CLQMS)** - Comprehensive audit trail implementation based on section 4.2.1.20 Error Management requirements, implementing 5W1H audit principles across four specialized log types.

---

## Executive Summary

This document defines the audit logging architecture for CLQMS, implementing the **5W1H audit principle** (What, When, Who, How, Where, Why) across four specialized log tables. The design supports both **manual** (user-initiated) and **automatic** (instrument/service-initiated) operations with complete traceability.

---

## 1. Requirements Analysis (Section 4.2.1.20)

### 5W1H Audit Principles

| Dimension | Description | Captured Fields |
|-----------|-------------|-----------------|
| **What** | Data changed, operation performed | `operation`, `table_name`, `field_name`, `previous_value`, `new_value` |
| **When** | Timestamp of activity | `created_at` |
| **Who** | User performing operation | `user_id` |
| **How** | Mechanism, application, session | `mechanism`, `application_id`, `web_page`, `session_id`, `event_type` |
| **Where** | Location of operation | `site_id`, `workstation_id`, `pc_name`, `ip_address` |
| **Why** | Reason for operation | `reason` |

### Four Log Types

| Log Type | Description | Examples |
|----------|-------------|----------|
| **Data Log** | Events related to data operations | Patient demographics, visits, test orders, samples, results, user data, master data, archiving, transaction errors |
| **Service Log** | Background service events | Host communication, instrument communication, printing, messaging, resource access, system errors |
| **Security Log** | Security and access events | Logins/logouts, file access, permission changes, password failures, system changes |
| **Error Log** | Error events by entity | Instrument errors, integration errors, validation errors |

### Mechanism Types

- **MANUAL**: User-initiated actions via web interface
- **AUTOMATIC**: System/instrument-initiated (duplo/repeated operations)

---

## 2. Table Architecture

### 2.1 Overview

Four separate tables optimized for different volumes and retention:

| Table | Volume | Retention | Partitioning |
|-------|--------|-----------|--------------|
| `data_audit_log` | Medium | 7 years | Monthly |
| `service_audit_log` | Very High | 2 years | Monthly |
| `security_audit_log` | Low | Permanent | No |
| `error_audit_log` | Variable | 5 years | Monthly |

---

### 2.2 Table: data_audit_log

```sql
CREATE TABLE data_audit_log (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- WHAT: Operation and data details
    operation           VARCHAR(50) NOT NULL,            -- 'CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', etc.
    entity_type         VARCHAR(50) NOT NULL,            -- 'patient', 'visit', 'test_order', 'sample', 'user', etc.
    entity_id           VARCHAR(36) NOT NULL,            -- ID of affected entity
    table_name          VARCHAR(100),                    -- Database table name
    field_name          VARCHAR(100),                    -- Specific field changed (NULL if multiple)
    previous_value      JSON,                          -- Value before change
    new_value           JSON,                          -- Value after change
    
    -- HOW: Mechanism details
    mechanism           ENUM('MANUAL', 'AUTOMATIC') NOT NULL DEFAULT 'MANUAL',
    application_id      VARCHAR(50),                     -- Application identifier
    web_page            VARCHAR(500),                    -- URL/endpoint accessed
    session_id          VARCHAR(100),                    -- Session identifier
    event_type          VARCHAR(100),                    -- Event classification
    
    -- WHERE: Location information
    site_id             VARCHAR(36),                     -- Site/location ID
    workstation_id      VARCHAR(36),                     -- Workstation ID
    pc_name             VARCHAR(100),                    -- Computer name
    ip_address          VARCHAR(45),                     -- IP address (IPv6 compatible)
    
    -- WHO: User information
    user_id             VARCHAR(36) NOT NULL,            -- User ID or 'SYSTEM' for automatic
    
    -- WHEN: Timestamp
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- WHY: Reason
    reason              TEXT,                            -- User-provided reason
    
    -- Context: Additional flexible data
    context             JSON,                          -- Log-type-specific extra data
    
    -- Indexes
    INDEX idx_operation_created (operation, created_at),
    INDEX idx_entity (entity_type, entity_id, created_at),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_mechanism (mechanism, created_at),
    INDEX idx_table (table_name, created_at),
    INDEX idx_site (site_id, created_at),
    INDEX idx_created (created_at),
    INDEX idx_session (session_id, created_at)
    
) ENGINE=InnoDB
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

**Data Log Examples:**
- Patient registration: `operation='CREATE'`, `entity_type='patient'`, `mechanism='MANUAL'`
- Sample result from instrument: `operation='UPDATE'`, `entity_type='result'`, `mechanism='AUTOMATIC'`
- User profile update: `operation='UPDATE'`, `entity_type='user'`, `mechanism='MANUAL'`

---

### 2.3 Table: service_audit_log

```sql
CREATE TABLE service_audit_log (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- WHAT: Service operation details
    operation           VARCHAR(50) NOT NULL,            -- 'COMMUNICATION', 'PRINT', 'BACKUP', 'MESSAGE', etc.
    entity_type         VARCHAR(50) NOT NULL,            -- 'host', 'instrument', 'database', 'network', etc.
    entity_id           VARCHAR(36) NOT NULL,            -- Service identifier
    service_class       VARCHAR(50),                     -- 'communication', 'printing', 'messaging', 'resource'
    resource_type       VARCHAR(100),                    -- 'database_access', 'backup', 'network', 'internet'
    resource_details    JSON,                          -- IP, port, connection details
    previous_value      JSON,                          -- State before
    new_value           JSON,                          -- State after
    
    -- HOW: Mechanism and context
    mechanism           ENUM('MANUAL', 'AUTOMATIC') NOT NULL DEFAULT 'AUTOMATIC',
    application_id      VARCHAR(50),                     -- Service application ID
    service_name        VARCHAR(100),                    -- Background service name
    session_id          VARCHAR(100),                    -- Service session
    event_type          VARCHAR(100),                    -- Event classification
    
    -- WHERE: Location and resources
    site_id             VARCHAR(36),
    workstation_id      VARCHAR(36),
    pc_name             VARCHAR(100),
    ip_address          VARCHAR(45),
    port                INT,                           -- Port number for network
    
    -- WHO: System or user
    user_id             VARCHAR(36) NOT NULL,            -- 'SYSTEM' for automatic services
    
    -- WHEN: Timestamp
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- WHY: Reason if manual
    reason              TEXT,
    
    -- Context: Service-specific data
    context             JSON,                          -- Communication details, error codes, etc.
    
    -- Indexes
    INDEX idx_operation_created (operation, created_at),
    INDEX idx_entity (entity_type, entity_id, created_at),
    INDEX idx_service_class (service_class, created_at),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_mechanism (mechanism, created_at),
    INDEX idx_site (site_id, created_at),
    INDEX idx_created (created_at)
    
) ENGINE=InnoDB
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

**Service Log Examples:**
- Instrument communication: `operation='COMMUNICATION'`, `entity_type='instrument'`, `service_class='communication'`
- Database backup: `operation='BACKUP'`, `entity_type='database'`, `service_class='resource'`
- Automatic print: `operation='PRINT'`, `service_class='printing'`, `mechanism='AUTOMATIC'`

---

### 2.4 Table: security_audit_log

```sql
CREATE TABLE security_audit_log (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- WHAT: Security event details
    operation           VARCHAR(50) NOT NULL,            -- 'LOGIN', 'LOGOUT', 'ACCESS_DENIED', 'PASSWORD_FAIL', etc.
    entity_type         VARCHAR(50) NOT NULL,            -- 'user', 'file', 'folder', 'setting', 'application'
    entity_id           VARCHAR(36) NOT NULL,            -- Target entity ID
    security_class      VARCHAR(50),                     -- 'authentication', 'authorization', 'system_change'
    resource_path       VARCHAR(500),                    -- File/folder path accessed
    previous_value      JSON,                          -- Previous security state
    new_value           JSON,                          -- New security state
    
    -- HOW: Access details
    mechanism           ENUM('MANUAL', 'AUTOMATIC') NOT NULL DEFAULT 'MANUAL',
    application_id      VARCHAR(50),
    web_page            VARCHAR(500),
    session_id          VARCHAR(100),
    event_type          VARCHAR(100),                    -- 'SUCCESS', 'FAILURE', 'WARNING'
    
    -- WHERE: Access location
    site_id             VARCHAR(36),
    workstation_id      VARCHAR(36),
    pc_name             VARCHAR(100),
    ip_address          VARCHAR(45),
    
    -- WHO: User attempting action
    user_id             VARCHAR(36) NOT NULL,            -- User ID or 'UNKNOWN' for failed attempts
    
    -- WHEN: Timestamp
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- WHY: Reason if provided
    reason              TEXT,
    
    -- Context: Security-specific data
    context             JSON,                          -- Permission changes, failure counts, etc.
    
    -- Indexes
    INDEX idx_operation_created (operation, created_at),
    INDEX idx_entity (entity_type, entity_id, created_at),
    INDEX idx_security_class (security_class, created_at),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_event_type (event_type, created_at),
    INDEX idx_site (site_id, created_at),
    INDEX idx_created (created_at),
    INDEX idx_session (session_id, created_at)
    
) ENGINE=InnoDB;
```

**Security Log Examples:**
- User login: `operation='LOGIN'`, `entity_type='user'`, `security_class='authentication'`, `event_type='SUCCESS'`
- Failed password: `operation='PASSWORD_FAIL'`, `entity_type='user'`, `security_class='authentication'`, `event_type='FAILURE'`
- Permission change: `operation='UPDATE'`, `entity_type='user'`, `security_class='authorization'`
- File access: `operation='ACCESS'`, `entity_type='file'`, `security_class='authorization'`

---

### 2.5 Table: error_audit_log

```sql
CREATE TABLE error_audit_log (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- WHAT: Error details
    operation           VARCHAR(50) NOT NULL,            -- 'ERROR', 'WARNING', 'CRITICAL'
    entity_type         VARCHAR(50) NOT NULL,            -- 'instrument', 'integration', 'database', 'validation'
    entity_id           VARCHAR(36) NOT NULL,            -- Entity where error occurred
    error_code          VARCHAR(50),                     -- Specific error code
    error_message       TEXT,                          -- Error message
    error_details       JSON,                          -- Stack trace, context
    previous_value      JSON,                          -- State before error
    new_value           JSON,                          -- State after error (if recovered)
    
    -- HOW: Error context
    mechanism           ENUM('MANUAL', 'AUTOMATIC') NOT NULL DEFAULT 'MANUAL',
    application_id      VARCHAR(50),
    web_page            VARCHAR(500),
    session_id          VARCHAR(100),
    event_type          VARCHAR(100),                    -- 'TRANSACTION_ERROR', 'SYSTEM_ERROR', 'VALIDATION_ERROR'
    
    -- WHERE: Error location
    site_id             VARCHAR(36),
    workstation_id      VARCHAR(36),
    pc_name             VARCHAR(100),
    ip_address          VARCHAR(45),
    
    -- WHO: User or system
    user_id             VARCHAR(36) NOT NULL,            -- User ID or 'SYSTEM'
    
    -- WHEN: Timestamp
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- WHY: Error context
    reason              TEXT,                          -- Why the error occurred
    
    -- Context: Additional error data
    context             JSON,                          -- Related IDs, transaction info, etc.
    
    -- Indexes
    INDEX idx_operation_created (operation, created_at),
    INDEX idx_entity (entity_type, entity_id, created_at),
    INDEX idx_error_code (error_code, created_at),
    INDEX idx_event_type (event_type, created_at),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_site (site_id, created_at),
    INDEX idx_created (created_at)
    
) ENGINE=InnoDB
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

**Error Log Examples:**
- Transaction error: `operation='ERROR'`, `entity_type='database'`, `event_type='TRANSACTION_ERROR'`
- Instrument error: `operation='ERROR'`, `entity_type='instrument'`, `event_type='SYSTEM_ERROR'`
- Integration error: `operation='ERROR'`, `entity_type='integration'`, `event_type='SYSTEM_ERROR'`
- Validation error: `operation='ERROR'`, `entity_type='validation'`, `event_type='VALIDATION_ERROR'`

---

## 3. Example Audit Entries

### 3.1 Data Log Entry (Patient Update)

```json
{
  "id": 15243,
  "operation": "UPDATE",
  "entity_type": "patient",
  "entity_id": "PAT-2026-001234",
  "table_name": "patients",
  "field_name": null,
  "previous_value": {
    "NameFirst": "John",
    "NameLast": "Doe",
    "Phone": "+1-555-0100"
  },
  "new_value": {
    "NameFirst": "Johnny",
    "NameLast": "Doe-Smith",
    "Phone": "+1-555-0199"
  },
  "mechanism": "MANUAL",
  "application_id": "CLQMS-WEB",
  "web_page": "/api/patient/PAT-2026-001234",
  "session_id": "sess_abc123",
  "event_type": "PATIENT_UPDATE",
  "site_id": "SITE-001",
  "workstation_id": "WS-001",
  "pc_name": "LAB-PC-01",
  "ip_address": "192.168.1.100",
  "user_id": "USR-001",
  "created_at": "2026-02-19T14:30:00Z",
  "reason": "Patient requested name change after marriage",
  "context": {
    "changed_fields": ["NameFirst", "NameLast", "Phone"],
    "validation_status": "PASSED"
  }
}
```

### 3.2 Service Log Entry (Instrument Communication)

```json
{
  "id": 89345,
  "operation": "COMMUNICATION",
  "entity_type": "instrument",
  "entity_id": "INST-001",
  "service_class": "communication",
  "resource_type": "instrument_communication",
  "resource_details": {
    "protocol": "HL7",
    "port": 2575,
    "direction": "INBOUND"
  },
  "previous_value": { "status": "IDLE" },
  "new_value": { "status": "RECEIVING" },
  "mechanism": "AUTOMATIC",
  "application_id": "INSTRUMENT-SERVICE",
  "service_name": "instrument-listener",
  "session_id": "svc_inst_001",
  "event_type": "RESULT_RECEIVED",
  "site_id": "SITE-001",
  "workstation_id": "WS-LAB-01",
  "pc_name": "LAB-SERVER-01",
  "ip_address": "192.168.1.10",
  "port": 2575,
  "user_id": "SYSTEM",
  "created_at": "2026-02-19T14:35:22Z",
  "reason": null,
  "context": {
    "sample_id": "SMP-2026-004567",
    "test_count": 5,
    "bytes_received": 2048
  }
}
```

### 3.3 Security Log Entry (Failed Login)

```json
{
  "id": 4521,
  "operation": "PASSWORD_FAIL",
  "entity_type": "user",
  "entity_id": "USR-999",
  "security_class": "authentication",
  "resource_path": "/api/auth/login",
  "previous_value": { "failed_attempts": 2 },
  "new_value": { "failed_attempts": 3 },
  "mechanism": "MANUAL",
  "application_id": "CLQMS-WEB",
  "web_page": "/login",
  "session_id": "sess_fail_789",
  "event_type": "FAILURE",
  "site_id": "SITE-002",
  "workstation_id": "WS-RECEPTION",
  "pc_name": "RECEPTION-PC-02",
  "ip_address": "203.0.113.45",
  "user_id": "USR-999",
  "created_at": "2026-02-19T15:10:05Z",
  "reason": null,
  "context": {
    "lockout_threshold": 5,
    "remaining_attempts": 2,
    "username_attempted": "john.doe"
  }
}
```

### 3.4 Error Log Entry (Database Transaction Failure)

```json
{
  "id": 1203,
  "operation": "ERROR",
  "entity_type": "database",
  "entity_id": "DB-PRIMARY",
  "error_code": "DB_TXN_001",
  "error_message": "Transaction rollback due to deadlock",
  "error_details": {
    "sql_state": "40001",
    "error_number": 1213,
    "deadlock_victim": true
  },
  "previous_value": { "transaction_status": "ACTIVE" },
  "new_value": { "transaction_status": "ROLLED_BACK" },
  "mechanism": "AUTOMATIC",
  "application_id": "CLQMS-WEB",
  "web_page": "/api/orders/batch-update",
  "session_id": "sess_xyz789",
  "event_type": "TRANSACTION_ERROR",
  "site_id": "SITE-001",
  "workstation_id": "WS-001",
  "pc_name": "LAB-PC-01",
  "ip_address": "192.168.1.100",
  "user_id": "USR-001",
  "created_at": "2026-02-19T15:15:30Z",
  "reason": "Deadlock detected during batch update",
  "context": {
    "affected_tables": ["orders", "order_tests"],
    "retry_count": 0,
    "transaction_id": "txn_20260219151530"
  }
}
```

---

## 4. Implementation Strategy

### 4.1 Central Audit Service

```php
<?php

namespace App\Services;

class AuditService
{
    /**
     * Log a DATA audit event
     */
    public static function logData(
        string $operation,
        string $entityType,
        string $entityId,
        ?string $tableName = null,
        ?string $fieldName = null,
        ?array $previousValue = null,
        ?array $newValue = null,
        ?string $reason = null,
        ?array $context = null
    ): void {
        self::log('data_audit_log', [
            'operation'      => $operation,
            'entity_type'    => $entityType,
            'entity_id'      => $entityId,
            'table_name'     => $tableName,
            'field_name'     => $fieldName,
            'previous_value' => $previousValue ? json_encode($previousValue) : null,
            'new_value'      => $newValue ? json_encode($newValue) : null,
            'mechanism'      => 'MANUAL',
            'application_id' => 'CLQMS-WEB',
            'web_page'       => $_SERVER['REQUEST_URI'] ?? null,
            'session_id'     => session_id(),
            'event_type'     => strtoupper($entityType) . '_' . strtoupper($operation),
            'site_id'        => session('site_id'),
            'workstation_id' => session('workstation_id'),
            'pc_name'        => gethostname(),
            'ip_address'     => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_id'        => auth()->id() ?? 'SYSTEM',
            'reason'         => $reason,
            'context'        => $context ? json_encode($context) : null,
            'created_at'     => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Log a SERVICE audit event
     */
    public static function logService(
        string $operation,
        string $entityType,
        string $entityId,
        string $serviceClass,
        ?string $resourceType = null,
        ?array $resourceDetails = null,
        ?array $previousValue = null,
        ?array $newValue = null,
        ?string $serviceName = null,
        ?array $context = null
    ): void {
        self::log('service_audit_log', [
            'operation'        => $operation,
            'entity_type'      => $entityType,
            'entity_id'        => $entityId,
            'service_class'    => $serviceClass,
            'resource_type'    => $resourceType,
            'resource_details' => $resourceDetails ? json_encode($resourceDetails) : null,
            'previous_value'   => $previousValue ? json_encode($previousValue) : null,
            'new_value'        => $newValue ? json_encode($newValue) : null,
            'mechanism'        => 'AUTOMATIC',
            'application_id'   => $serviceName ?? 'SYSTEM-SERVICE',
            'service_name'     => $serviceName,
            'session_id'       => session_id() ?: 'service_session',
            'event_type'       => strtoupper($serviceClass) . '_' . strtoupper($operation),
            'site_id'          => session('site_id'),
            'workstation_id'   => session('workstation_id'),
            'pc_name'          => gethostname(),
            'ip_address'       => $_SERVER['REMOTE_ADDR'] ?? null,
            'port'             => $resourceDetails['port'] ?? null,
            'user_id'          => 'SYSTEM',
            'reason'           => null,
            'context'          => $context ? json_encode($context) : null,
            'created_at'       => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Log a SECURITY audit event
     */
    public static function logSecurity(
        string $operation,
        string $entityType,
        string $entityId,
        string $securityClass,
        ?string $eventType = 'SUCCESS',
        ?string $resourcePath = null,
        ?array $previousValue = null,
        ?array $newValue = null,
        ?string $reason = null,
        ?array $context = null
    ): void {
        self::log('security_audit_log', [
            'operation'      => $operation,
            'entity_type'    => $entityType,
            'entity_id'      => $entityId,
            'security_class' => $securityClass,
            'resource_path'  => $resourcePath,
            'previous_value' => $previousValue ? json_encode($previousValue) : null,
            'new_value'      => $newValue ? json_encode($newValue) : null,
            'mechanism'      => 'MANUAL',
            'application_id' => 'CLQMS-WEB',
            'web_page'       => $_SERVER['REQUEST_URI'] ?? null,
            'session_id'     => session_id(),
            'event_type'     => $eventType,
            'site_id'        => session('site_id'),
            'workstation_id' => session('workstation_id'),
            'pc_name'        => gethostname(),
            'ip_address'     => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_id'        => auth()->id() ?? 'UNKNOWN',
            'reason'         => $reason,
            'context'        => $context ? json_encode($context) : null,
            'created_at'     => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Log an ERROR audit event
     */
    public static function logError(
        string $entityType,
        string $entityId,
        string $errorCode,
        string $errorMessage,
        string $eventType,
        ?array $errorDetails = null,
        ?array $previousValue = null,
        ?array $newValue = null,
        ?string $reason = null,
        ?array $context = null
    ): void {
        self::log('error_audit_log', [
            'operation'      => 'ERROR',
            'entity_type'    => $entityType,
            'entity_id'      => $entityId,
            'error_code'     => $errorCode,
            'error_message'  => $errorMessage,
            'error_details'  => $errorDetails ? json_encode($errorDetails) : null,
            'previous_value' => $previousValue ? json_encode($previousValue) : null,
            'new_value'      => $newValue ? json_encode($newValue) : null,
            'mechanism'      => 'AUTOMATIC',
            'application_id' => 'CLQMS-WEB',
            'web_page'       => $_SERVER['REQUEST_URI'] ?? null,
            'session_id'     => session_id() ?: 'system',
            'event_type'     => $eventType,
            'site_id'        => session('site_id'),
            'workstation_id' => session('workstation_id'),
            'pc_name'        => gethostname(),
            'ip_address'     => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_id'        => auth()->id() ?? 'SYSTEM',
            'reason'         => $reason,
            'context'        => $context ? json_encode($context) : null,
            'created_at'     => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Generic log method with async support
     */
    private static function log(string $table, array $data): void
    {
        // For high-volume operations, dispatch to queue
        if (in_array($table, ['service_audit_log', 'error_audit_log'])) {
            self::dispatchAuditJob($table, $data);
        } else {
            // Direct insert for data and security logs
            \Config\Database::connect()->table($table)->insert($data);
        }
    }
    
    private static function dispatchAuditJob(string $table, array $data): void
    {
        // Implementation: Queue the audit entry for async processing
        // This prevents blocking user operations during high-volume logging
    }
}
```

---

## 5. Query Patterns

### 5.1 Common Audit Queries

```sql
-- View patient history (DATA log)
SELECT * FROM data_audit_log 
WHERE entity_type = 'patient' 
AND entity_id = 'PAT-2026-001234'
ORDER BY created_at DESC;

-- User activity report
SELECT operation, entity_type, COUNT(*) as count
FROM data_audit_log
WHERE user_id = 'USR-001'
AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY operation, entity_type;

-- Instrument communication history (SERVICE log)
SELECT * FROM service_audit_log
WHERE entity_type = 'instrument'
AND entity_id = 'INST-001'
AND operation = 'COMMUNICATION'
ORDER BY created_at DESC;

-- Failed login attempts (SECURITY log)
SELECT * FROM security_audit_log
WHERE operation IN ('PASSWORD_FAIL', 'ACCESS_DENIED')
AND event_type = 'FAILURE'
AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY created_at DESC;

-- Recent errors (ERROR log)
SELECT * FROM error_audit_log
WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
AND event_type = 'CRITICAL'
ORDER BY created_at DESC;

-- Find changes to specific field
SELECT * FROM data_audit_log
WHERE table_name = 'patients'
AND field_name = 'Phone'
AND entity_id = 'PAT-2026-001234'
ORDER BY created_at DESC;
```

---

## 6. Migration Plan

### Phase 1: Foundation (Week 1)
- [ ] Drop existing unused tables (patreglog, patvisitlog, specimenlog)
- [ ] Create 4 new audit tables with partitioning
- [ ] Create AuditService class
- [ ] Add database indexes

### Phase 2: Core Implementation (Week 2)
- [ ] Integrate data_audit_log into Patient model
- [ ] Integrate data_audit_log into Order/Test models
- [ ] Integrate data_audit_log into Master data models
- [ ] Integrate security_audit_log into authentication

### Phase 3: Service & Error Logging (Week 3)
- [ ] Implement service_audit_log for instrument communication
- [ ] Implement service_audit_log for printing/messaging
- [ ] Implement error_audit_log for database errors
- [ ] Implement error_audit_log for instrument errors
- [ ] Implement error_audit_log for integration errors

### Phase 4: API & Optimization (Week 4)
- [ ] Create unified API endpoint for querying all log types
- [ ] Add filters by log_type, date range, user, entity
- [ ] Implement async logging queue
- [ ] Add log export functionality (CSV/PDF)

---

## 7. Retention Strategy (TBD)

| Table | Proposed Retention | Notes |
|-------|-------------------|-------|
| `data_audit_log` | 7 years | Patient data compliance |
| `service_audit_log` | 2 years | High volume, operational only |
| `security_audit_log` | Permanent | Compliance and forensics |
| `error_audit_log` | 5 years | Debugging and incident analysis |

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Table Count** | 4 tables | Separates by log type, different retention needs |
| **5W1H** | All 6 dimensions captured | Complete audit trail per section 4.2.1.20 |
| **Mechanism** | MANUAL vs AUTOMATIC | Distinguishes user vs instrument operations |
| **User for AUTO** | 'SYSTEM' | Clear identification of automatic operations |
| **JSON Storage** | previous_value, new_value, context | Flexible schema evolution |
| **Partitioning** | Monthly for high-volume tables | Manage service and error log growth |
| **Async Logging** | Yes for service/error logs | Don't block user operations |

---

*Document Version: 2.0*  
*Based on: Section 4.2.1.20 Error Management*  
*Date: February 20, 2026*
