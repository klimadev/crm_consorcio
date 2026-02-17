'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { Card } from '@/components/ui/Card';
import { leadApi, pdvApi, teamApi } from '@/services/api';
import type { LeadStage } from '@/types';

type LeadListItem = {
  id: string;
  title: string;
  customerName: string;
  stage: LeadStage;
  consistencyStatus: 'PENDING' | 'VALID' | 'INCONSISTENT';
};

type LeadDetailsData = {
  stage: LeadStage;
  consistencyStatus: 'PENDING' | 'VALID' | 'INCONSISTENT';
  consistencyIssues: string[];
};

const stageOrder: LeadStage[] = ['PROSPECTING', 'PROPOSAL', 'CONSISTENCY_CHECK', 'ADESÃO', 'CANCELLED'];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    title: '',
    customerName: '',
    financialTotalValue: 0,
    financialCreditValue: 0,
    financialDownPayment: 0,
    financialMonths: 1,
    financialInstallmentValue: 0,
  });

  const leadsQuery = useQuery<LeadListItem[]>({ queryKey: ['leads'], queryFn: leadApi.list });
  const pdvsQuery = useQuery({ queryKey: ['pdvs'], queryFn: pdvApi.list });
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: teamApi.list });
  const pdvs = Array.isArray(pdvsQuery.data) ? pdvsQuery.data : [];
  const teams = Array.isArray(teamsQuery.data) ? teamsQuery.data : [];

  const createLeadMutation = useMutation({
    mutationFn: leadApi.create,
    onSuccess: () => {
      setNewLead({
        title: '',
        customerName: '',
        financialTotalValue: 0,
        financialCreditValue: 0,
        financialDownPayment: 0,
        financialMonths: 1,
        financialInstallmentValue: 0,
      });
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ leadId, nextStage }: { leadId: string; nextStage: LeadStage }) =>
      leadApi.moveStage(leadId, { nextStage }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      if (selectedLeadId) {
        void queryClient.invalidateQueries({ queryKey: ['lead-details', selectedLeadId] });
      }
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ leadId, documentType }: { leadId: string; documentType: 'RG' | 'CPF' | 'CONTRACT' }) =>
      leadApi.uploadDocument(leadId, { documentType, fileName: `${documentType.toLowerCase()}.pdf` }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      if (selectedLeadId) {
        void queryClient.invalidateQueries({ queryKey: ['lead-details', selectedLeadId] });
      }
    },
  });

  const leadDetailsQuery = useQuery<LeadDetailsData>({
    queryKey: ['lead-details', selectedLeadId],
    queryFn: async () => {
      if (!selectedLeadId) {
        throw new Error('lead id is required');
      }
      return leadApi.details(selectedLeadId);
    },
    enabled: !!selectedLeadId,
  });

  const grouped = useMemo(() => {
    const initial: Record<LeadStage, LeadListItem[]> = {
      PROSPECTING: [],
      PROPOSAL: [],
      CONSISTENCY_CHECK: [],
      ADESÃO: [],
      CANCELLED: [],
    };
    for (const lead of leadsQuery.data ?? []) {
      initial[lead.stage].push(lead);
    }
    return initial;
  }, [leadsQuery.data]);

  // TODO(nav): Wire onViewChange to router/state; noop callback breaks sidebar items without href.
  return (
    <MainAppLayout currentView="kanban" onViewChange={() => {}}>
      <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
        <Card title="Create lead">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createLeadMutation.mutate(newLead);
            }}
          >
            <input
              value={newLead.title}
              onChange={(event) => setNewLead((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Lead title"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={newLead.customerName}
              onChange={(event) => setNewLead((prev) => ({ ...prev, customerName: event.target.value }))}
              placeholder="Customer name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={newLead.financialTotalValue}
                onChange={(event) => setNewLead((prev) => ({ ...prev, financialTotalValue: Number(event.target.value) }))}
                placeholder="Total"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={newLead.financialInstallmentValue}
                onChange={(event) =>
                  setNewLead((prev) => ({ ...prev, financialInstallmentValue: Number(event.target.value) }))
                }
                placeholder="Installment"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setNewLead((prev) => ({ ...prev, pdvId: event.target.value || undefined }))}
              >
                <option value="">Select PDV</option>
                {pdvs.map((pdv) => (
                  <option key={pdv.id} value={pdv.id}>
                    {pdv.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setNewLead((prev) => ({ ...prev, teamId: event.target.value || undefined }))}
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Create
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-5">
            {stageOrder.map((stage) => (
              <section key={stage} className="rounded-xl border border-slate-200 bg-white p-3">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">{stage}</h3>
                <div className="space-y-2">
                  {grouped[stage]?.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-left text-xs transition hover:border-amber-300"
                    >
                      <p className="font-semibold text-slate-800">{lead.title}</p>
                      <p className="text-slate-500">{lead.customerName}</p>
                      <span
                        className={`mt-1 inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${
                          lead.consistencyStatus === 'VALID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : lead.consistencyStatus === 'INCONSISTENT'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {lead.consistencyStatus}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {selectedLeadId && leadDetailsQuery.data && (
            <Card title="Lead consistency panel">
              <p className="text-sm text-slate-700">
                <strong>Current stage:</strong> {leadDetailsQuery.data.stage}
              </p>
              <p className="mt-1 text-sm text-slate-700">
                <strong>Consistency status:</strong> {leadDetailsQuery.data.consistencyStatus}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {stageOrder.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => moveStageMutation.mutate({ leadId: selectedLeadId, nextStage: stage })}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Move to {stage}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['RG', 'CPF', 'CONTRACT'] as const).map((documentType) => (
                  <button
                    key={documentType}
                    onClick={() => uploadDocMutation.mutate({ leadId: selectedLeadId, documentType })}
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Upload {documentType}
                  </button>
                ))}
              </div>
              {Array.isArray(leadDetailsQuery.data.consistencyIssues) && leadDetailsQuery.data.consistencyIssues.length > 0 && (
                <ul className="mt-4 space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {leadDetailsQuery.data.consistencyIssues.map((issue) => (
                    <li key={issue}>- {issue}</li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </MainAppLayout>
  );
}
