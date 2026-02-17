'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { Card } from '@/components/ui/Card';
import { pdvApi, teamApi } from '@/services/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [pdvName, setPdvName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamPdvId, setTeamPdvId] = useState('');

  const pdvsQuery = useQuery({ queryKey: ['settings-pdvs'], queryFn: pdvApi.list });
  const teamsQuery = useQuery({ queryKey: ['settings-teams'], queryFn: teamApi.list });
  const pdvs = Array.isArray(pdvsQuery.data) ? pdvsQuery.data : [];
  const teams = Array.isArray(teamsQuery.data) ? teamsQuery.data : [];

  const createPdvMutation = useMutation({
    mutationFn: pdvApi.create,
    onSuccess: () => {
      setPdvName('');
      void queryClient.invalidateQueries({ queryKey: ['settings-pdvs'] });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => {
      setTeamName('');
      setTeamPdvId('');
      void queryClient.invalidateQueries({ queryKey: ['settings-teams'] });
    },
  });

  // TODO(nav): Wire onViewChange to router/state; noop callback breaks sidebar items without href.
  return (
    <MainAppLayout currentView="settings" onViewChange={() => {}}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="PDVs">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              createPdvMutation.mutate({ name: pdvName });
            }}
          >
            <input
              value={pdvName}
              onChange={(event) => setPdvName(event.target.value)}
              placeholder="PDV name"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Add</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {pdvs.map((pdv) => (
              <li key={pdv.id} className="rounded-lg border border-slate-200 px-3 py-2">
                {pdv.name}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Teams">
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              createTeamMutation.mutate({ name: teamName, pdvId: teamPdvId || undefined });
            }}
          >
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Team name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={teamPdvId}
              onChange={(event) => setTeamPdvId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No PDV</option>
              {pdvs.map((pdv) => (
                <option key={pdv.id} value={pdv.id}>
                  {pdv.name}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white">Create team</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {teams.map((team) => (
              <li key={team.id} className="rounded-lg border border-slate-200 px-3 py-2">
                {team.name}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </MainAppLayout>
  );
}
