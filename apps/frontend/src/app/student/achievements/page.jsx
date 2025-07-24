'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Trophy,
  Star,
  Crown,
  Target,
  Award,
  Copy,
  Share2,
  CheckCircle,
  Clock
} from 'lucide-react';
import { getSession } from '@/lib/session';
import AchievementCard from '@/components/student/achievement-card';
import { mockAchievements } from '@/lib/mock-student-data';

export default function AchievementsPage() {
  const [session, setSession] = useState(null);
  const [achievements, setAchievements] = useState(mockAchievements);
  const [filteredAchievements, setFilteredAchievements] = useState(mockAchievements);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showQR, setShowQR] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession || currentSession.role !== 'student') {
      router.push('/login');
      return;
    }
    setSession(currentSession);
  }, [router]);

  useEffect(() => {
    let filtered = achievements;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(achievement => 
        achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        achievement.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(achievement => achievement.status === statusFilter);
    }

    setFilteredAchievements(filtered);
  }, [achievements, searchTerm, statusFilter]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const claimAchievement = (achievementId) => {
    console.log("Claiming achievement: " + achievementId);
    // In a real app, this would call an API to claim the achievement
    setAchievements(prev => 
      prev.map(achievement => 
        achievement.id === achievementId 
          ? { ...achievement, status: 'claimed' }
          : achievement
      )
    );
  };

  const copyProof = (proofId) => {
    copyToClipboard(proofId);
  };

  const getAchievementStats = () => {
    const total = achievements.length;
    const claimed = achievements.filter(a => a.status === 'claimed').length;
    const claimable = achievements.filter(a => a.status === 'claimable').length;
    return { total, claimed, claimable };
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = getAchievementStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Achievements</h1>
          <p className="text-muted-foreground">ZKP badges and academic awards</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Achievements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.claimed}</p>
                <p className="text-sm text-muted-foreground">Claimed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.claimable}</p>
                <p className="text-sm text-muted-foreground">Ready to Claim</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search achievements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="claimable">Ready to Claim</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredAchievements.length} of {achievements.length} achievements
        </p>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">{stats.claimed} Claimed</Badge>
          <Badge variant="outline">{stats.claimable} Claimable</Badge>
          <Badge variant="outline">{achievements.filter(a => a.status === 'locked').length} Locked</Badge>
        </div>
      </div>

      {/* Achievements Grid */}
      {filteredAchievements.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onClaim={(achievement) => claimAchievement(achievement.id)}
              onCopyProof={(achievement) => copyProof(achievement.proof_id)}
              onShare={(achievement) => copyToClipboard("https://genuinegrads.xyz/verify?proof=" + achievement.proof_id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No achievements found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters to see more results.'
                : 'You don\'t have any achievements yet.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 