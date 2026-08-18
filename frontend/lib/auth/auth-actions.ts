'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import apiServerInstance from '@/lib/axios-server-v1';
import { AxiosError } from 'axios';

/**
 * Normalize backend role names (e.g. SUPER_ADMIN, COMPANY_ADMIN) to
 * the short lowercase identifiers the frontend expects (admin, pawnshop, investor).
 */
function normalizeRoleId(roleName: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'admin',
    COMPANY_ADMIN: 'admin',
    PAWNSHOP: 'pawnshop',
    INVESTOR: 'investor',
    BORROWER: 'investor',
  }
  return map[roleName] || roleName.toLowerCase()
}
// import { getMemberByToken } from '@/features/profile/services/profile-service';

export async function authenticateUser(credentials: { email: string; password: string; isAdmin?: boolean }) {
  try {
    credentials.email = credentials.email.toLowerCase();
    const endpoint = credentials.isAdmin ? '/auth/admin/login' : '/auth/login';
    const response = await apiServerInstance.post(endpoint, {
        username: credentials.email,
        password: credentials.password,
    });

    const repsonseData = response.data.data;


    if (!repsonseData?.accessToken) {
      return { success: false, error: response.data.message || 'No token received' }
    }

    const cookieStore = await cookies()
    cookieStore.set('accessToken', repsonseData.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 0.15 // 15 minutes
    })

    cookieStore.set('refreshToken', repsonseData.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    // Admin logins don't have a user profile endpoint — return early with role info
    if (credentials.isAdmin) {
      const normalizedRole = normalizeRoleId(repsonseData.roleName || '');
      return {
        success: true,
        data: {
          userInfo: {
            userEmail: credentials.email,
            userFirstName: normalizedRole === 'admin' ? 'Super' : 'Company',
            userLastName: 'Admin',
            roleId: normalizedRole,
          }
        },
        userType: normalizedRole,
        token: repsonseData.accessToken,
        refreshToken: repsonseData.refreshToken,
      };
    }

    const member = (await apiServerInstance.get('/auth/user/profile')).data;
    if (!member.success) {
      return { success: false, error: member.message }
    }

    // Normalize the role from the profile response as well
    const profileRoleId = member.data?.userInfo?.roleId;
    if (profileRoleId) {
      member.data.userInfo.roleId = normalizeRoleId(profileRoleId);
    }

    return {
      success: true,
      data: member.data,
      userType: normalizeRoleId(repsonseData.roleName || ''),
      token: repsonseData.accessToken,
      refreshToken: repsonseData.refreshToken,
    };

  } catch(error: unknown) {
    if (error instanceof AxiosError) {

      if (error.status === 401) {
        return { success: false, error: error.response?.data?.message || 'Invalid email or password. Please try again.' }
      }

      return { success: false, error: error.response?.data?.message || 'Authentication failed, Please try again later.' }
    }

    return { success: false, error: 'Authentication failed, Please try again later.' }
  }
}

export async function logoutUser() {
    const cookieStore = await cookies()
  //   const response = await memberLogout();
  //   if (!response.success) {
    //     return { success: false, error: response.message }
    //   }
    cookieStore.delete('authToken')
    cookieStore.delete('accessToken')
    cookieStore.delete('refreshToken')

    
    redirect('/en/admin/login')
}
