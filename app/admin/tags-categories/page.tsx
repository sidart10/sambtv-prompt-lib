'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trash2, Edit, Plus, Hash, GitMerge, Shuffle, ArrowLeft, RefreshCw } from 'lucide-react'
import { getCategories, createCategory } from '@/app/actions/prompts'
import { getTags, createTag, updateTag, deleteTag, updateCategory, deleteCategory, mergeTags, getRelatedTags } from '@/app/actions/tags'
import Navigation from '@/components/navigation/Navigation'

interface Category {
  id: number
  name: string
  description: string | null
  display_order: number
}

interface Tag {
  id: number
  name: string
  usage_count?: number
}

export default function TagsCategoriesManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [newCategory, setNewCategory] = useState({ name: '', description: '', display_order: 0 })
  const [newTag, setNewTag] = useState({ name: '' })
  const [selectedTagsForMerge, setSelectedTagsForMerge] = useState<number[]>([])
  const [targetTagForMerge, setTargetTagForMerge] = useState<number | null>(null)
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user is admin (same logic as main admin page)
    const isAdmin = session.user?.email?.endsWith('@samba.tv')
    if (!isAdmin) {
      toast.error("You don't have permission to access the admin dashboard.")
      router.push('/')
      return
    }

    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [categoriesData, tagsData] = await Promise.all([
        getCategories(),
        getTags()
      ])
      setCategories(categoriesData)
      setTags(tagsData)
    } catch (error) {
      toast.error('Failed to load data')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    toast.success('Data refreshed successfully')
  }

  // Category handlers
  const handleCreateCategory = async () => {
    try {
              const category = await createCategory(
          newCategory.name,
          newCategory.description || undefined
        )
      setCategories([...categories, category])
      setNewCategory({ name: '', description: '', display_order: 0 })
      toast.success('Category created successfully')
    } catch (error) {
      toast.error('Failed to create category')
      console.error(error)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return
    
    try {
      await updateCategory(editingCategory.id, {
        name: editingCategory.name,
        description: editingCategory.description,
        display_order: editingCategory.display_order
      })
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? editingCategory : cat
      ))
      setEditingCategory(null)
      toast.success('Category updated successfully')
    } catch (error) {
      toast.error('Failed to update category')
      console.error(error)
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    
    try {
      await deleteCategory(id)
      setCategories(categories.filter(cat => cat.id !== id))
      toast.success('Category deleted successfully')
    } catch (error) {
      toast.error('Failed to delete category')
      console.error(error)
    }
  }

  // Tag handlers
  const handleCreateTag = async () => {
    try {
      const tag = await createTag(newTag.name)
      setTags([...tags, tag])
      setNewTag({ name: '' })
      toast.success('Tag created successfully')
    } catch (error) {
      toast.error('Failed to create tag')
      console.error(error)
    }
  }

  const handleUpdateTag = async () => {
    if (!editingTag) return
    
    try {
      await updateTag(editingTag.id, editingTag.name)
      setTags(tags.map(tag => 
        tag.id === editingTag.id ? editingTag : tag
      ))
      setEditingTag(null)
      toast.success('Tag updated successfully')
    } catch (error) {
      toast.error('Failed to update tag')
      console.error(error)
    }
  }

  const handleDeleteTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return
    
    try {
      await deleteTag(id)
      setTags(tags.filter(tag => tag.id !== id))
      toast.success('Tag deleted successfully')
    } catch (error) {
      toast.error('Failed to delete tag')
      console.error(error)
          }
    }

  // Tag governance handlers
  const handleMergeTags = async () => {
    if (selectedTagsForMerge.length < 2 || !targetTagForMerge) {
      toast.error('Please select at least 2 tags to merge and a target tag')
      return
    }

    if (selectedTagsForMerge.includes(targetTagForMerge)) {
      toast.error('Target tag cannot be one of the tags being merged')
      return
    }

    try {
      const result = await mergeTags(selectedTagsForMerge, targetTagForMerge)
      
      // Remove merged tags from the list and update target tag usage
      setTags(prevTags => 
        prevTags.filter(tag => !selectedTagsForMerge.includes(tag.id))
      )
      
      // Reset selection
      setSelectedTagsForMerge([])
      setTargetTagForMerge(null)
      setShowMergeDialog(false)
      
      toast.success(`Successfully merged ${selectedTagsForMerge.length} tags. ${result.affectedPrompts} prompts updated.`)
      
      // Refresh data
      await fetchData()
    } catch (error) {
      toast.error('Failed to merge tags')
      console.error(error)
    }
  }

  const handleTagSelectionForMerge = (tagId: number) => {
    setSelectedTagsForMerge(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleCleanupUnusedTags = async () => {
    if (!confirm('Are you sure you want to delete all tags with 0 usage? This cannot be undone.')) return
    
    try {
      const unusedTags = tags.filter(tag => (tag.usage_count || 0) === 0)
      
      for (const tag of unusedTags) {
        await deleteTag(tag.id)
      }
      
      setTags(tags.filter(tag => (tag.usage_count || 0) > 0))
      toast.success(`Deleted ${unusedTags.length} unused tags`)
    } catch (error) {
      toast.error('Failed to cleanup tags')
      console.error(error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading tags and categories...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/admin')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tags & Categories Management</h1>
              <p className="text-muted-foreground">Manage tags and categories for organizing prompts</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2 mt-4 sm:mt-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

      <Card>
          <CardContent className="pt-6">
                      <Tabs defaultValue="categories" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="categories">Categories</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
                <TabsTrigger value="governance">Tag Tools</TabsTrigger>
              </TabsList>
            
            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-4">
              {/* Add new category form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add New Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="category-name">Name</Label>
                      <Input
                        id="category-name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="Category name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category-description">Description</Label>
                      <Input
                        id="category-description"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category-order">Display Order</Label>
                      <Input
                        id="category-order"
                        type="number"
                        value={newCategory.display_order}
                        onChange={(e) => setNewCategory({ ...newCategory, display_order: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateCategory}
                    disabled={!newCategory.name}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </CardContent>
              </Card>

              {/* Categories list */}
              <div className="space-y-2">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <h3 className="font-medium">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-gray-600">{category.description}</p>
                        )}
                        <p className="text-xs text-gray-500">Order: {category.display_order}</p>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCategory(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Category</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Name</Label>
                                <Input
                                  value={editingCategory?.name || ''}
                                  onChange={(e) => setEditingCategory(prev => prev ? { ...prev, name: e.target.value } : null)}
                                />
                              </div>
                              <div>
                                <Label>Description</Label>
                                <Textarea
                                  value={editingCategory?.description || ''}
                                  onChange={(e) => setEditingCategory(prev => prev ? { ...prev, description: e.target.value } : null)}
                                />
                              </div>
                              <div>
                                <Label>Display Order</Label>
                                <Input
                                  type="number"
                                  value={editingCategory?.display_order || 0}
                                  onChange={(e) => setEditingCategory(prev => prev ? { ...prev, display_order: parseInt(e.target.value) || 0 } : null)}
                                />
                              </div>
                              <Button onClick={handleUpdateCategory}>
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags" className="space-y-4">
              {/* Add new tag form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add New Tag</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      value={newTag.name}
                      onChange={(e) => setNewTag({ name: e.target.value })}
                      placeholder="Tag name"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleCreateTag}
                      disabled={!newTag.name}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tag
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tags list */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {tags.map((tag) => (
                  <Card key={tag.id}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{tag.name}</span>
                        {tag.usage_count !== undefined && (
                          <span className="text-xs text-gray-500">({tag.usage_count} uses)</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingTag(tag)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Tag</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Name</Label>
                                <Input
                                  value={editingTag?.name || ''}
                                  onChange={(e) => setEditingTag(prev => prev ? { ...prev, name: e.target.value } : null)}
                                />
                              </div>
                              <Button onClick={handleUpdateTag}>
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                              </div>
              </TabsContent>

              {/* Tag Governance Tab */}
              <TabsContent value="governance" className="space-y-4">
                {/* Tag Cleanup Tools */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shuffle className="w-5 h-5" />
                      Tag Governance Tools
                    </CardTitle>
                    <CardDescription>
                      Advanced tools for managing and maintaining tag quality
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Cleanup unused tags */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">Cleanup Unused Tags</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Remove all tags that have 0 usage count to keep the tag system clean.
                      </p>
                      <Button 
                        onClick={handleCleanupUnusedTags}
                        variant="outline"
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cleanup Unused Tags ({tags.filter(t => (t.usage_count || 0) === 0).length})
                      </Button>
                    </div>

                    {/* Tag merging */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">Merge Similar Tags</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Combine multiple similar tags into one to reduce duplication.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Select tags to merge:</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto">
                            {tags.map((tag) => (
                              <div
                                key={tag.id}
                                className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                                  selectedTagsForMerge.includes(tag.id)
                                    ? 'bg-primary/10 border-primary'
                                    : 'hover:bg-muted'
                                }`}
                                onClick={() => handleTagSelectionForMerge(tag.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedTagsForMerge.includes(tag.id)}
                                  onChange={() => handleTagSelectionForMerge(tag.id)}
                                  className="rounded"
                                />
                                <span className="text-sm truncate">
                                  {tag.name} ({tag.usage_count || 0})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedTagsForMerge.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium">Select target tag (will keep this one):</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                              {tags
                                .filter(tag => !selectedTagsForMerge.includes(tag.id))
                                .map((tag) => (
                                  <div
                                    key={tag.id}
                                    className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                                      targetTagForMerge === tag.id
                                        ? 'bg-green-100 border-green-500'
                                        : 'hover:bg-muted'
                                    }`}
                                    onClick={() => setTargetTagForMerge(tag.id)}
                                  >
                                    <input
                                      type="radio"
                                      name="targetTag"
                                      checked={targetTagForMerge === tag.id}
                                      onChange={() => setTargetTagForMerge(tag.id)}
                                      className="rounded"
                                    />
                                    <span className="text-sm truncate">
                                      {tag.name} ({tag.usage_count || 0})
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            onClick={handleMergeTags}
                            disabled={selectedTagsForMerge.length < 2 || !targetTagForMerge}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <GitMerge className="w-4 h-4 mr-2" />
                            Merge Tags ({selectedTagsForMerge.length} → 1)
                          </Button>
                          
                          {selectedTagsForMerge.length > 0 && (
                            <Button 
                              onClick={() => {
                                setSelectedTagsForMerge([])
                                setTargetTagForMerge(null)
                              }}
                              variant="outline"
                            >
                              Clear Selection
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h3 className="font-medium mb-2">Tag Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-lg">{tags.length}</div>
                          <div className="text-muted-foreground">Total Tags</div>
                        </div>
                        <div>
                          <div className="font-medium text-lg">
                            {tags.filter(t => (t.usage_count || 0) > 0).length}
                          </div>
                          <div className="text-muted-foreground">Active Tags</div>
                        </div>
                        <div>
                          <div className="font-medium text-lg">
                            {tags.filter(t => (t.usage_count || 0) === 0).length}
                          </div>
                          <div className="text-muted-foreground">Unused Tags</div>
                        </div>
                        <div>
                          <div className="font-medium text-lg">
                            {Math.round(tags.reduce((sum, t) => sum + (t.usage_count || 0), 0) / tags.length) || 0}
                          </div>
                          <div className="text-muted-foreground">Avg Usage</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
      </Card>
      </div>
    </div>
  )
} 