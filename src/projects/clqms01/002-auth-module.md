---
layout: clqms-post.njk
tags: clqms
title: "CLQMS: JWT Authentication Module"
date: 2025-12-02
order: 2
---

# CLQMS: JWT Authentication Module

## Authentication Strategy

Security is paramount for medical data. We are implementing a stateless JWT authentication mechanism.

## Features

- **Access Tokens:** Short-lived (15 min)
- **Refresh Tokens:** Long-lived (7 days) with rotation
- **Role-Based Access Control (RBAC):** Granular permissions for Lab Techs, Managers, and Admins.
