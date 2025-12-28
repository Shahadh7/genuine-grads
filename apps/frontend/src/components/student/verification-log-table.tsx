'use client';
import React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Globe, Calendar } from 'lucide-react';

interface Props {
  // Add props here
}

export default function VerificationLogTable({logs}): React.JSX.Element {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead className="w-[200px]">Asset ID</TableHead>
            <TableHead className="w-[150px]">IP Address</TableHead>
            <TableHead>Verified By</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log: any) => (
            <TableRow key={log.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(log.date).toLocaleDateString()}</span>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {log.asset_id}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {log.ip_address}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{log.verified_by}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {log.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No verification records found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 