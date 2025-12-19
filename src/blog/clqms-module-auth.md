---
title: "CLQMS: JWT Authentication Module"
description: "Implementing secure authentication using JSON Web Tokens (JWT) for the API."
date: 2025-12-21
order: 2
tags:
  - posts
  - clqms
layout: clqms-post.njk
---

# Authentication Strategy

Security is paramount for medical data. We are implementing a stateless JWT authentication mechanism.

## Features
- **Access Tokens:** Short-lived (15 min)
- **Refresh Tokens:** Long-lived (7 days) with rotation
- **Role-Based Access Control (RBAC):** Granular permissions for Lab Techs, Managers, and Admins.
