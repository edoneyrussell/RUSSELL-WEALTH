import { useSecurityFetch } from "../demo/securityDemo";
import { useEffect } from 'react';
import { useRemoteData } from '../experience/useRemoteData';

export type SecurityEvent = {
  location?: string;
  accuracy_m?: number;
  location_permission?: string;
  location_basis?: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  assigned_user_id?: number | null;
  assigned_at?: string | null;
  assigned_name?: string | null;
  assigned_email?: string | null;
  workflow_version?: number;
  is_overdue?: boolean;
  due_at?: string | null;
  escalated_at?: string | null;
  escalation_ack_at?: string | null;
  title?: string;
  status?: string;
  evidence?: { id: number; account_email: string | null; event_type: string; source_ip: string | null; created_at: string }[];
  id: number;
  user_id: number | null;
  email: string | null;
  event_type: string;
  source_ip: string | null;
  severity: string;
  details: string | null;
  created_at: string;
};

export type SecurityOverview = {
  success: boolean;
  metrics: {
    total_events: number;
    successful_logins: number;
    failed_logins: number;
    blocked_attempts: number;
  open_incidents?: number;
  total_incidents?: number;
  resolved_incidents?: number;
    info_events: number;
    warning_events: number;
    critical_events: number;
  };
  threat_trends?: {hour: string; total: number; failed: number; successful: number}[];
  recent_events: SecurityEvent[];
  top_sources: {
    source_ip: string;
    event_count: number;
  }[];
};

export function useSecurityOverview() {
  const securityFetch = useSecurityFetch();
  const result=useRemoteData<SecurityOverview>('/api/security/overview',securityFetch,{pollMs:10000,validate:value=>Boolean(value?.success&&value.metrics&&Array.isArray(value.recent_events))});
  useEffect(()=>{const refresh=()=>{void result.refresh();};window.addEventListener('rw-location-updated',refresh);return()=>window.removeEventListener('rw-location-updated',refresh);},[result.refresh]);
  return result;
}
