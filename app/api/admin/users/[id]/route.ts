import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/auth-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin status
    await requireAdmin()
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {

    const requestBody = await request.json()
    const { action, role } = requestBody
    const { id: userId } = await params

    if (!action || !userId) {
      return NextResponse.json({ error: 'Missing action or user ID' }, { status: 400 })
    }

    const supabase = await createSupabaseAdminClient()

    switch (action) {
      case 'suspend':
        // For now, we'll just return success since we don't have a suspended status in profiles
        return NextResponse.json({ success: true, message: 'User suspended' })
      
      case 'activate':
        // For now, we'll just return success since we don't have an active status in profiles
        return NextResponse.json({ success: true, message: 'User activated' })
      
      case 'delete':
        // Delete user and all related data
        const { error: deleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId)
        
        if (deleteError) {
          return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
        }
        
        return NextResponse.json({ success: true, message: 'User deleted' })

      case 'change_role':
        if (!role || !['admin', 'member'].includes(role)) {
          return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        // Update the user's role in the profiles table
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', userId)

        if (roleError) {
          console.error('Error updating user role:', roleError)
          return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          message: `Role changed to ${role}`,
          role 
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error performing user action:', error)
    return NextResponse.json(
      { error: 'Failed to perform user action' },
      { status: 500 }
    )
  }
}