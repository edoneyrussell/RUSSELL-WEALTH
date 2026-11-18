export const securityTourSteps = [
  {section:'SOC Dashboard',target:'soc-dashboard',title:'Start with the SOC dashboard',body:'The Security Operations Center dashboard summarizes live monitoring, alert activity, security coverage, threat trends, and recent events.'},
  {section:'Alerts',target:'soc-alerts',title:'Triage security alerts',body:'Open Alerts to review severity, status, escalation state, and alert details. This simulated workflow demonstrates how analysts identify and prioritize suspicious activity.'},
  {section:'Incidents',target:'soc-incidents',title:'Investigate incidents',body:'Incidents brings related alerts and events into a structured response workflow. Review status, severity, ownership, and the affected account or system.'},
  {section:'Logs',target:'soc-logs',title:'Search the event logs',body:'Logs let you inspect authentication and infrastructure activity across the environment. Use them to trace source addresses, timestamps, actions, and outcomes.'},
  {section:'Network',target:'soc-network',title:'Review network posture',body:'Network shows the demo application gateway, API service, database, monitoring state, and representative infrastructure health.'},
  {section:'Access',target:'soc-access',title:'Manage identity and access',body:'Access Management displays fictional customer and SOC identities. Review account status and role context to understand least-privilege administration.'},
  {section:'Admin Settings',target:'soc-settings',title:'Inspect security administration',body:'Admin Settings contains analyst controls and simulated policy information. In this public demo, account changes and real integrations remain read-only.'},
] as const;
