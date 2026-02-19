---
layout: clqms-post.njk
tags: clqms
title: "CLQMS: Audit Logging Architecture Plan"
description: "Comprehensive audit trail strategy for tracking changes across master data, patient records, and laboratory operations"
date: 2026-02-19
order: 4
---

# Audit Logging Architecture Plan for CLQMS

> **Clinical Laboratory Quality Management System (CLQMS)** - A comprehensive audit trail strategy for tracking changes across master data, patient records, and laboratory operations.

---

## Executive Summary

This document outlines a unified audit logging architecture for CLQMS, designed to provide complete traceability of data changes while maintaining optimal performance and maintainability. The approach separates audit logs into three domain-specific tables, utilizing JSON for flexible value storage.

---

## 1. Current State Analysis

### Existing Audit Infrastructure

| Aspect | Current Status |
|--------|---------------|
| **Database Tables** | 3 tables exist in migrations (patreglog, patvisitlog, specimenlog) |
| **Implementation** | Tables created but not actively used |
| **Structure** | Fixed column approach (FldName, FldValuePrev) |
| **Code Coverage** | No models or controllers implemented |
| **Application Logging** | Basic CodeIgniter file logging for debug/errors |

### Pain Points Identified

- ❌ **3 separate tables** with nearly identical schemas
- ❌ **Fixed column structure** - rigid and requires schema changes for new entities
- ❌ **No implementation** - audit tables exist but aren't populated
- ❌ **Maintenance overhead** - adding new entities requires new migrations

---

## 2. Proposed Architecture

### 2.1 Domain Separation

We categorize audit logs by **data domain** and **access patterns**:

| Table | Domain | Volume | Retention | Use Case |
|-------|--------|--------|-----------|----------|
| `master_audit_log` | Reference Data | Low | Permanent | Organizations, Users, ValueSets |
| `patient_audit_log` | Patient Records | Medium | 7 years | Demographics, Contacts, Insurance |
| `order_audit_log` | Operations | High | 2 years | Orders, Tests, Specimens, Results |

### 2.2 Unified Table Structure

#### Master Audit Log

```sql
CREATE TABLE master_audit_log (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,          -- 'organization', 'user', 'valueset'
    entity_id       VARCHAR(36) NOT NULL,          -- UUID or primary key
    action          ENUM('CREATE', 'UPDATE', 'DELETE', 'PATCH') NOT NULL,
    
    old_values      JSON NULL,                      -- Complete snapshot before change
    new_values      JSON NULL,                      -- Complete snapshot after change
    changed_fields  JSON,                           -- Array of modified field names
    
    -- Context
    user_id         VARCHAR(36),
    site_id         VARCHAR(36),
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    app_version     VARCHAR(20),
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at),
    INDEX idx_user (user_id, created_at)
) ENGINE=InnoDB;
```

#### Patient Audit Log

```sql
CREATE TABLE patient_audit_log (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,          -- 'patient', 'contact', 'insurance'
    entity_id       VARCHAR(36) NOT NULL,
    patient_id      VARCHAR(36),                  -- Context FK for patient
    
    action          ENUM('CREATE', 'UPDATE', 'DELETE', 'MERGE', 'UNMERGE') NOT NULL,
    
    old_values      JSON NULL,
    new_values      JSON NULL,
    changed_fields  JSON,
    reason          TEXT,                         -- Why the change was made
    
    -- Context
    user_id         VARCHAR(36),
    site_id         VARCHAR(36),
    ip_address      VARCHAR(45),
    session_id      VARCHAR(100),
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_patient (patient_id, created_at),
    INDEX idx_created (created_at),
    INDEX idx_user (user_id, created_at)
) ENGINE=InnoDB;
```

#### Order/Test Audit Log

```sql
CREATE TABLE order_audit_log (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,          -- 'order', 'test', 'specimen', 'result'
    entity_id       VARCHAR(36) NOT NULL,
    
    -- Context FKs
    patient_id      VARCHAR(36),
    visit_id        VARCHAR(36),
    order_id        VARCHAR(36),
    
    action          ENUM('CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'REORDER', 'COLLECT', 'RESULT') NOT NULL,
    
    old_values      JSON NULL,
    new_values      JSON NULL,
    changed_fields  JSON,
    status_transition VARCHAR(100),                  -- e.g., 'pending->collected'
    
    -- Context
    user_id         VARCHAR(36),
    site_id         VARCHAR(36),
    device_id       VARCHAR(36),                   -- Instrument/edge device
    ip_address      VARCHAR(45),
    session_id      VARCHAR(100),
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_order (order_id, created_at),
    INDEX idx_patient (patient_id, created_at),
    INDEX idx_created (created_at),
    INDEX idx_user (user_id, created_at)
) ENGINE=InnoDB;
```

---

## 3. JSON Value Structure

### Example Audit Entry

```json
{
  "id": 15243,
  "entity_type": "patient",
  "entity_id": "PAT-2026-001234",
  "action": "UPDATE",
  
  "old_values": {
    "NameFirst": "John",
    "NameLast": "Doe",
    "Gender": "M",
    "BirthDate": "1990-01-15",
    "Phone": "+1-555-0100"
  },
  
  "new_values": {
    "NameFirst": "Johnny",
    "NameLast": "Doe-Smith",
    "Gender": "M",
    "BirthDate": "1990-01-15",
    "Phone": "+1-555-0199"
  },
  
  "changed_fields": ["NameFirst", "NameLast", "Phone"],
  
  "user_id": "USR-001",
  "site_id": "SITE-001",
  "created_at": "2026-02-19T14:30:00Z"
}
```

### Benefits of JSON Approach

✅ **Schema Evolution** - Add new fields without migrations  
✅ **Complete Snapshots** - Reconstruct full record state at any point  
✅ **Flexible Queries** - MySQL 8.0+ supports JSON indexing and extraction  
✅ **Audit Integrity** - Store exactly what changed, no data loss  

---

## 4. Implementation Strategy

### 4.1 Central Audit Service

```php
<?php

namespace App\Services;

class AuditService
{
    /**
     * Log an audit event to the appropriate table
     */
    public static function log(
        string $category,        // 'master', 'patient', 'order'
        string $entityType,     // e.g., 'patient', 'order'
        string $entityId,
        string $action,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $reason = null,
        ?array $context = null
    ): void {
        $changedFields = self::calculateChangedFields($oldValues, $newValues);
        
        $data = [
            'entity_type'    => $entityType,
            'entity_id'      => $entityId,
            'action'         => $action,
            'old_values'     => $oldValues ? json_encode($oldValues) : null,
            'new_values'     => $newValues ? json_encode($newValues) : null,
            'changed_fields' => json_encode($changedFields),
            'user_id'        => auth()->id() ?? 'SYSTEM',
            'site_id'        => session('site_id') ?? 'MAIN',
            'created_at'     => date('Y-m-d H:i:s')
        ];
        
        // Route to appropriate table
        $table = match($category) {
            'master'  => 'master_audit_log',
            'patient' => 'patient_audit_log',
            'order'   => 'order_audit_log',
            default   => throw new \InvalidArgumentException("Unknown category: $category")
        };
        
        // Async logging recommended for high-volume operations
        self::dispatchAuditJob($table, $data);
    }
    
    private static function calculateChangedFields(?array $old, ?array $new): array
    {
        if (!$old || !$new) return [];
        
        $changes = [];
        $allKeys = array_unique(array_merge(array_keys($old), array_keys($new)));
        
        foreach ($allKeys as $key) {
            if (($old[$key] ?? null) !== ($new[$key] ?? null)) {
                $changes[] = $key;
            }
        }
        
        return $changes;
    }
}
```

### 4.2 Model Integration

```php
<?php

namespace App\Models;

use App\Services\AuditService;

class PatientModel extends BaseModel
{
    protected $table = 'patients';
    protected $primaryKey = 'PatientID';
    
    protected function logAudit(
        string $action, 
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        AuditService::log(
            category: 'patient',
            entityType: 'patient',
            entityId: $this->getPatientId(),
            action: $action,
            oldValues: $oldValues,
            newValues: $newValues
        );
    }
    
    // Override save method to auto-log
    public function save($data): bool
    {
        $oldData = $this->find($data['PatientID'] ?? null);
        
        $result = parent::save($data);
        
        if ($result) {
            $this->logAudit(
                $oldData ? 'UPDATE' : 'CREATE',
                $oldData?->toArray(),
                $this->find($data['PatientID'])->toArray()
            );
        }
        
        return $result;
    }
}
```

---

## 5. Query Patterns & Performance

### 5.1 Common Queries

```sql
-- View entity history
SELECT * FROM patient_audit_log 
WHERE entity_type = 'patient' 
AND entity_id = 'PAT-2026-001234'
ORDER BY created_at DESC;

-- User activity report
SELECT entity_type, action, COUNT(*) as count
FROM patient_audit_log
WHERE user_id = 'USR-001'
AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY entity_type, action;

-- Find all changes to a specific field
SELECT * FROM order_audit_log
WHERE JSON_CONTAINS(changed_fields, '"result_value"')
AND patient_id = 'PAT-001'
AND created_at > '2026-01-01';
```

### 5.2 Partitioning Strategy (Order/Test)

For high-volume tables, implement monthly partitioning:

```sql
CREATE TABLE order_audit_log (
    -- ... columns
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202601 VALUES LESS THAN (202602),
    PARTITION p202602 VALUES LESS THAN (202603),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

## 6. Soft Delete Handling

Soft deletes ARE captured as audit entries with complete snapshots:

```php
// When soft deleting a patient:
AuditService::log(
    category: 'patient',
    entityType: 'patient',
    entityId: $patientId,
    action: 'DELETE',
    oldValues: $fullRecordBeforeDelete,  // Complete last known state
    newValues: null,
    reason: 'Patient requested data removal'
);
```

This ensures:
- ✅ Full audit trail even for deleted records
- ✅ Compliance with "right to be forgotten" (GDPR)
- ✅ Ability to restore accidentally deleted records

---

## 7. Migration Plan

### Phase 1: Foundation (Week 1)
- [ ] Drop existing unused tables (patreglog, patvisitlog, specimenlog)
- [ ] Create new audit tables with JSON columns
- [ ] Create AuditService class
- [ ] Add database indexes

### Phase 2: Core Implementation (Week 2)
- [ ] Integrate AuditService into Patient model
- [ ] Integrate AuditService into Order model
- [ ] Integrate AuditService into Master data models
- [ ] Add audit trail to authentication events

### Phase 3: API & UI (Week 3)
- [ ] Create API endpoints for querying audit logs
- [ ] Build admin interface for audit review
- [ ] Add audit export functionality (CSV/PDF)

### Phase 4: Optimization (Week 4)
- [ ] Implement async logging queue
- [ ] Add table partitioning for order_audit_log
- [ ] Set up retention policies and archiving
- [ ] Performance testing and tuning

---

## 8. Retention & Archiving Strategy

| Table | Retention Period | Archive Action |
|-------|---------------|----------------|
| `master_audit_log` | Permanent | None (keep forever) |
| `patient_audit_log` | 7 years | Move to cold storage after 7 years |
| `order_audit_log` | 2 years | Partition rotation: drop old partitions |

### Automated Maintenance

```sql
-- Monthly job: Archive old patient audit logs
INSERT INTO patient_audit_log_archive
SELECT * FROM patient_audit_log
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);

DELETE FROM patient_audit_log
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);

-- Monthly job: Drop old order partitions
ALTER TABLE order_audit_log DROP PARTITION p202501;
```

---

## 9. Questions for Stakeholders

Before implementation, please confirm:

1. **Retention Policy**: Are the proposed retention periods (master=forever, patient=7 years, order=2 years) compliant with your regulatory requirements?

2. **Async vs Sync**: Should audit logging be synchronous (block on failure) or asynchronous (queue-based)? Recommended: async for order/test operations.

3. **Archive Storage**: Where should archived audit logs be stored? Options: separate database, file storage (S3), or compressed tables.

4. **User Access**: Which user roles need access to audit trails? Should users see their own audit history?

5. **Compliance**: Do you need specific compliance features (e.g., HIPAA audit trail requirements, 21 CFR Part 11 for FDA)?

---

## 10. Key Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Table Count** | 3 tables | Separates concerns, optimizes queries, different retention |
| **JSON vs Columns** | JSON for values | Flexible, handles schema changes, complete snapshots |
| **Full vs Diff** | Full snapshots | Easier to reconstruct history, no data loss |
| **Soft Deletes** | Captured in audit | Compliance and restore capability |
| **Partitioning** | Order table only | High volume, time-based queries |
| **Async Logging** | Recommended | Don't block user operations |

---

## Conclusion

This unified audit logging architecture provides:

✅ **Complete traceability** across all data domains  
✅ **Regulatory compliance** with proper retention  
✅ **Performance optimization** through domain separation  
✅ **Flexibility** via JSON value storage  
✅ **Maintainability** with centralized service  

The approach balances audit integrity with system performance, ensuring CLQMS can scale while maintaining comprehensive audit trails.

---

*Document Version: 1.0*  
*Author: CLQMS Development Team*  
*Date: February 19, 2026*
