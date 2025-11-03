'use client';
import React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Copy, Share2 } from 'lucide-react';

interface Props {
  // Add props here
}

export default function AchievementCard({achievement, onClaim, onCopyProof, onShare}): React.React.JSX.Element {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const handleCopyProof = () => {
    copyToClipboard(achievement.proof_id);
    if (onCopyProof) onCopyProof(achievement);
  };

  const handleShare = () => {
    const url = `https://genuinegrads.xyz/verify?proof=${achievement.proof_id}`;
    copyToClipboard(url);
    if (onShare) onShare(achievement);
  };

  const IconComponent = achievement.icon || Trophy;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{achievement.title}</CardTitle>
            <CardDescription>{achievement.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={achievement.status === 'claimed' ? 'default' : 'secondary'}>
            {achievement.status === 'claimed' ? 'Claimed' : 'Claimable'}
          </Badge>
        </div>
        
        {achievement.status === 'claimed' && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Proof ID:</span>
              <span className="font-mono text-xs">{achievement.proof_id}</span>
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          {achievement.status === 'claimable' ? (
            <Button 
              size="sm" 
              className="flex-1" 
              onClick={() => onClaim && onClaim(achievement)}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Claim ZKP
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="flex-1" 
              variant="outline"
              onClick={handleCopyProof}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Proof
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 