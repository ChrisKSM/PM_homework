import { useQuery } from '@tanstack/react-query'
import { jiraApi } from '../api/jiraApi'
import { jiraFetchOrMock } from '../utils/jiraFetch'
import type {
  ProjectSummary,
  EpicProgress,
  IssueDistribution,
  SprintVelocity,
  RiskIssue,
  BurndownData,
  SprintSummary,
  MemberWorkload,
  SprintIssue,
  SprintReport,
} from '../types/jira'
import {
  mockProjectSummary,
  mockEpicProgress,
  mockIssueDistribution,
  mockVelocity,
  mockRiskIssues,
  mockSprintSummary,
  mockBurndown,
  mockTeamWorkload,
  mockSprintIssues,
  mockSprintReport,
} from '../mocks/mockData'

// ── 책임자 대시보드 ──────────────────────────────────────────────────────────

export function useProjectSummary() {
  return useQuery<ProjectSummary>({
    queryKey: ['projectSummary'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getProjectSummary(), mockProjectSummary),
    staleTime: 5 * 60 * 1000,
  })
}

export function useEpicProgress() {
  return useQuery<EpicProgress[]>({
    queryKey: ['epicProgress'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getEpicProgress(), mockEpicProgress),
    staleTime: 5 * 60 * 1000,
  })
}

export function useIssueDistribution() {
  return useQuery<IssueDistribution[]>({
    queryKey: ['issueDistribution'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getIssueDistribution(), mockIssueDistribution),
    staleTime: 5 * 60 * 1000,
  })
}

export function useVelocity() {
  return useQuery<SprintVelocity[]>({
    queryKey: ['velocity'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getVelocity(), mockVelocity),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRiskIssues() {
  return useQuery<RiskIssue[]>({
    queryKey: ['riskIssues'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getRiskIssues(), mockRiskIssues),
    staleTime: 5 * 60 * 1000,
  })
}

// ── 개발팀 대시보드 ──────────────────────────────────────────────────────────

export function useSprintSummary() {
  return useQuery<SprintSummary>({
    queryKey: ['sprintSummary'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getSprintSummary(), mockSprintSummary),
    staleTime: 2 * 60 * 1000,
  })
}

export function useBurndown() {
  return useQuery<BurndownData>({
    queryKey: ['burndown'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getBurndown(), mockBurndown),
    staleTime: 2 * 60 * 1000,
  })
}

export function useTeamWorkload() {
  return useQuery<MemberWorkload[]>({
    queryKey: ['teamWorkload'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getTeamWorkload(), mockTeamWorkload),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSprintIssues() {
  return useQuery<SprintIssue[]>({
    queryKey: ['sprintIssues'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getCurrentSprintIssues(), mockSprintIssues),
    staleTime: 2 * 60 * 1000,
  })
}

// 주간 스프린트 요약 보고 — 버튼 클릭 시에만 생성(enabled:false → refetch로 트리거)
export function useSprintReport() {
  return useQuery<SprintReport>({
    queryKey: ['sprintReport'],
    queryFn: () => jiraFetchOrMock(() => jiraApi.getSprintReport(true), mockSprintReport),
    enabled: false,
    gcTime: 30 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
  })
}
