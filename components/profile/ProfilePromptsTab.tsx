'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Grid3X3, List, Heart, Copy, GitFork, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { PaginatedResponse } from '@/app/actions/profile';
import { ProfilePromptsSkeleton } from './ProfilePromptsSkeleton';

interface ProfilePromptsTabProps {
  userId: string;
  fetchFunction: (userId: string, params: any) => Promise<PaginatedResponse<any>>;
  title: string;
  description: string;
  emptyMessage: string;
  emptySubMessage: string;
  showAuthor?: boolean;
}

export default function ProfilePromptsTab({
  userId,
  fetchFunction,
  title,
  description,
  emptyMessage,
  emptySubMessage,
  showAuthor = false,
}: ProfilePromptsTabProps) {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('profileViewMode') as 'grid' | 'list') || 'grid';
    }
    return 'grid';
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  useEffect(() => {
    loadPrompts();
  }, [page]);

  useEffect(() => {
    // Save view mode preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('profileViewMode', viewMode);
    }
  }, [viewMode]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetchFunction(userId, { page, limit: 12 });
      setPrompts(response.data);
      setPagination({
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
        hasMore: response.pagination.hasMore,
      });
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPromptCard = (prompt: any) => (
    <Link key={prompt.id} href={`/prompt/${prompt.id}`} className="block">
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer card-hover tap-highlight">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-2">
                {prompt.title}
              </CardTitle>
              {prompt.categories && (
                <Badge variant="secondary" className="mt-2">
                  {prompt.categories.name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2">
            {prompt.description}
          </CardDescription>
          {showAuthor && prompt.profiles && (
            <p className="text-sm text-muted-foreground mt-2">
              by {prompt.profiles.name || prompt.profiles.username || 'Anonymous'}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {prompt.user_favorites?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-4 h-4" />
              {prompt.prompt_forks?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <Copy className="w-4 h-4" />
              {prompt.uses || 0}
            </span>
          </div>
          <span className="text-xs">
            {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );

  const renderPromptListItem = (prompt: any) => (
    <Link key={prompt.id} href={`/prompt/${prompt.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer tap-highlight touch-scale">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex-1">
            <h3 className="font-medium">
              {prompt.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {prompt.description}
            </p>
            {showAuthor && prompt.profiles && (
              <p className="text-xs text-muted-foreground mt-1">
                by {prompt.profiles.name || prompt.profiles.username || 'Anonymous'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-6 ml-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {prompt.user_favorites?.length || 0}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-4 h-4" />
                {prompt.prompt_forks?.length || 0}
              </span>
              <span className="flex items-center gap-1">
                <Copy className="w-4 h-4" />
                {prompt.uses || 0}
              </span>
            </div>
            {prompt.categories && (
              <Badge variant="secondary">
                {prompt.categories.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilePromptsSkeleton viewMode={viewMode} count={6} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {prompts.length > 0 && (
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value: string) => value && setViewMode(value as 'grid' | 'list')}
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid3X3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {prompts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{emptyMessage}</p>
            <p className="text-sm mt-2">{emptySubMessage}</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prompts.map(renderPromptCard)}
              </div>
            ) : (
              <div className="space-y-2">
                {prompts.map(renderPromptListItem)}
              </div>
            )}
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {prompts.length} of {pagination.total} prompts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 