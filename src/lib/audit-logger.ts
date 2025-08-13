interface AuditLogEntry {
  timestamp: string;
  adminEmail: string;
  adminUserId: string;
  action: string;
  targetUserId?: string;
  targetEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  additionalData?: Record<string, unknown>;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 log entries in memory

  log(entry: Omit<AuditLogEntry, 'timestamp'>) {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, you would also send this to a persistent logging service
    console.log('[ADMIN_AUDIT]', JSON.stringify(logEntry));
    
    // Optional: Send to external logging service
    this.sendToExternalLogger();
  }

  private async sendToExternalLogger() {
    try {
      // Example: Send to CloudWatch Logs, Datadog, or similar
      // await fetch('/api/logging/audit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry),
      // });
    } catch (error) {
      console.error('Failed to send audit log to external service:', error);
    }
  }

  getRecentLogs(limit = 50): AuditLogEntry[] {
    return this.logs.slice(-limit).reverse();
  }

  getLogsByAdmin(adminUserId: string, limit = 50): AuditLogEntry[] {
    return this.logs
      .filter(log => log.adminUserId === adminUserId)
      .slice(-limit)
      .reverse();
  }

  getLogsByAction(action: string, limit = 50): AuditLogEntry[] {
    return this.logs
      .filter(log => log.action === action)
      .slice(-limit)
      .reverse();
  }

  getFailedActions(limit = 50): AuditLogEntry[] {
    return this.logs
      .filter(log => !log.success)
      .slice(-limit)
      .reverse();
  }

  // Security monitoring methods
  detectSuspiciousActivity(adminUserId: string, timeWindowMs = 300000): boolean {
    const windowStart = Date.now() - timeWindowMs;
    const recentLogs = this.logs.filter(
      log => log.adminUserId === adminUserId && 
             new Date(log.timestamp).getTime() > windowStart
    );

    // Flag if admin performed more than 20 actions in 5 minutes
    if (recentLogs.length > 20) {
      return true;
    }

    // Flag if admin had more than 3 failed actions in the time window
    const failedActions = recentLogs.filter(log => !log.success);
    if (failedActions.length > 3) {
      return true;
    }

    // Flag if admin performed high-risk actions multiple times
    const highRiskActions = recentLogs.filter(log => 
      ['deleteUser', 'makeAdmin', 'removeAdmin'].includes(log.action)
    );
    if (highRiskActions.length > 5) {
      return true;
    }

    return false;
  }

  getSecurityAlerts(): Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
    const alerts = [];
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recent24hLogs = this.logs.filter(
      log => new Date(log.timestamp).getTime() > last24Hours
    );

    // Check for excessive failed logins
    const failedActions = recent24hLogs.filter(log => !log.success);
    if (failedActions.length > 10) {
      alerts.push({
        type: 'excessive_failures',
        message: `${failedActions.length} failed admin actions in the last 24 hours`,
        severity: 'medium' as const,
      });
    }

    // Check for multiple admin promotions
    const adminPromotions = recent24hLogs.filter(log => log.action === 'makeAdmin');
    if (adminPromotions.length > 3) {
      alerts.push({
        type: 'multiple_admin_promotions',
        message: `${adminPromotions.length} users promoted to admin in the last 24 hours`,
        severity: 'high' as const,
      });
    }

    // Check for user deletions
    const userDeletions = recent24hLogs.filter(log => log.action === 'deleteUser');
    if (userDeletions.length > 0) {
      alerts.push({
        type: 'user_deletions',
        message: `${userDeletions.length} users deleted in the last 24 hours`,
        severity: 'medium' as const,
      });
    }

    return alerts;
  }
}

export const auditLogger = new AuditLogger();

// Helper function to extract request information
export function getRequestInfo(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1',
    userAgent: request.headers.get('user-agent') || 'Unknown',
  };
}

// Helper function for consistent admin action logging
export async function logAdminAction({
  action,
  adminEmail,
  adminUserId,
  targetUserId,
  targetEmail,
  request,
  success,
  errorMessage,
  additionalData,
}: {
  action: string;
  adminEmail: string;
  adminUserId: string;
  targetUserId?: string;
  targetEmail?: string;
  request?: Request;
  success: boolean;
  errorMessage?: string;
  additionalData?: Record<string, unknown>;
}) {
  const requestInfo = request ? getRequestInfo(request) : { ipAddress: 'unknown', userAgent: 'unknown' };
  
  auditLogger.log({
    adminEmail,
    adminUserId,
    action,
    targetUserId,
    targetEmail,
    ipAddress: requestInfo.ipAddress,
    userAgent: requestInfo.userAgent,
    success,
    errorMessage,
    additionalData,
  });

  // Check for suspicious activity
  if (auditLogger.detectSuspiciousActivity(adminUserId)) {
    console.warn(`[SECURITY_ALERT] Suspicious activity detected for admin ${adminEmail} (${adminUserId})`);
    
    // In production, you might want to:
    // 1. Send an alert to security team
    // 2. Temporarily restrict admin privileges
    // 3. Require additional authentication
  }
}