'use client';

import { useState, useCallback } from 'react';
import { apiClient, ENDPOINTS } from '@/lib/api-client';

export function useProfile() {
  const [loading, setLoading] = useState(false);

  const getMyProfile = useCallback(async () => {
    setLoading(true);
    try { return await apiClient.get(ENDPOINTS.myProfile); }
    finally { setLoading(false); }
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    setLoading(true);
    try { return await apiClient.patch(ENDPOINTS.updateProfile, data); }
    finally { setLoading(false); }
  }, []);

  const getPublicProfile = useCallback(async (slug: string) => {
    return apiClient.get(`/profile/${slug}`);
  }, []);

  const getCompleteness = useCallback(async () => {
    return apiClient.get(ENDPOINTS.profileCompleteness);
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(ENDPOINTS.avatarUpload, formData, {
      headers: {},
      formData: true,
    });
  }, []);

  const addSkill = useCallback(async (skillId: string) => {
    return apiClient.post(ENDPOINTS.mySkills, { skillId });
  }, []);

  const removeSkill = useCallback(async (skillId: string) => {
    return apiClient.delete(`${ENDPOINTS.mySkills}/${skillId}`);
  }, []);

  const listPortfolio = useCallback(async () => {
    return apiClient.get(ENDPOINTS.portfolioList);
  }, []);

  const addPortfolioItem = useCallback(async (data: any) => {
    return apiClient.post(ENDPOINTS.portfolioList, data);
  }, []);

  const updatePortfolioItem = useCallback(async (id: string, data: any) => {
    return apiClient.patch(`${ENDPOINTS.portfolioList}/${id}`, data);
  }, []);

  const deletePortfolioItem = useCallback(async (id: string) => {
    return apiClient.delete(`${ENDPOINTS.portfolioList}/${id}`);
  }, []);

  const listServices = useCallback(async () => {
    return apiClient.get(ENDPOINTS.servicesList);
  }, []);

  const addService = useCallback(async (data: any) => {
    return apiClient.post(ENDPOINTS.servicesList, data);
  }, []);

  const updateService = useCallback(async (id: string, data: any) => {
    return apiClient.patch(`${ENDPOINTS.servicesList}/${id}`, data);
  }, []);

  const deleteService = useCallback(async (id: string) => {
    return apiClient.delete(`${ENDPOINTS.servicesList}/${id}`);
  }, []);

  const listSocialLinks = useCallback(async () => {
    return apiClient.get(ENDPOINTS.socialLinksList);
  }, []);

  const addSocialLink = useCallback(async (data: any) => {
    return apiClient.post(ENDPOINTS.socialLinksList, data);
  }, []);

  const deleteSocialLink = useCallback(async (id: string) => {
    return apiClient.delete(`${ENDPOINTS.socialLinksList}/${id}`);
  }, []);

  const updateAvailability = useCallback(async (status: string) => {
    return apiClient.patch(ENDPOINTS.updateAvailability, { status });
  }, []);

  const updateVisibility = useCallback(async (visibility: string) => {
    return apiClient.patch(ENDPOINTS.updateVisibility, { visibility });
  }, []);

  const updateSlug = useCallback(async (slug: string) => {
    return apiClient.patch(ENDPOINTS.updateSlug, { slug });
  }, []);

  const checkSlug = useCallback(async (slug: string) => {
    return apiClient.get<{ available: boolean }>(`${ENDPOINTS.checkSlug}/${slug}`);
  }, []);

  return {
    loading,
    getMyProfile,
    updateProfile,
    getPublicProfile,
    getCompleteness,
    uploadAvatar,
    addSkill, removeSkill,
    listPortfolio, addPortfolioItem, updatePortfolioItem, deletePortfolioItem,
    listServices, addService, updateService, deleteService,
    listSocialLinks, addSocialLink, deleteSocialLink,
    updateAvailability, updateVisibility,
    updateSlug, checkSlug,
  };
}
