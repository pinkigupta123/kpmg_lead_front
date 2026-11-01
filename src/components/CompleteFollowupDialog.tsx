import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Portal, Dialog, Button, Text, TextInput, Chip } from 'react-native-paper';
import api from '../services/api';
import { dateInDays } from '../utils/followup';

export interface CompleteTarget {
  id: number;
  scheduled_for: string;
  customerName?: string;
}

const STATUS_OPTIONS = ['contacted', 'follow-up', 'interested', 'purchased', 'closed'];
const NEXT_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'No next', days: null },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In a week', days: 7 },
];

/** "Mark follow-up done": outcome note, optional status change, optional next follow-up. */
export default function CompleteFollowupDialog({ target, onClose, onDone }: { target: CompleteTarget | null; onClose: () => void; onDone: () => void }) {
  const [outcome, setOutcome] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [nextDays, setNextDays] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setOutcome('');
      setStatus(null);
      setNextDays(null);
    }
  }, [target]);

  const save = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await api.post(`/lead/followups/${target.id}/complete`, {
        outcome: outcome.trim() || undefined,
        status: status || undefined,
        next_followup_date: nextDays ? dateInDays(nextDays) : undefined,
      });
      onDone();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not complete the follow-up.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={!!target} onDismiss={saving ? undefined : onClose}>
        <Dialog.Title>Mark follow-up done</Dialog.Title>
        <Dialog.Content>
          <Text style={{ color: '#5B6B7A', marginBottom: 12 }}>
            {target?.customerName ? `${target.customerName} · ` : ''}scheduled for {target?.scheduled_for}
          </Text>
          <TextInput
            label="What happened? (outcome)"
            value={outcome}
            onChangeText={setOutcome}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="e.g. Called, customer will visit on Saturday"
          />

          <Text style={styles.label}>Update lead status (optional)</Text>
          <View style={styles.chips}>
            {STATUS_OPTIONS.map((s) => (
              <Chip key={s} selected={status === s} showSelectedOverlay onPress={() => setStatus(status === s ? null : s)} style={styles.chip}>
                {s}
              </Chip>
            ))}
          </View>

          <Text style={styles.label}>Next follow-up</Text>
          <View style={styles.chips}>
            {NEXT_OPTIONS.map((o) => (
              <Chip key={o.label} selected={nextDays === o.days} showSelectedOverlay onPress={() => setNextDays(o.days)} style={styles.chip}>
                {o.label}
              </Chip>
            ))}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={saving}>Cancel</Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving}>Mark done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 14, marginBottom: 6, fontSize: 12, fontWeight: '700', color: '#5B6B7A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { marginBottom: 2 },
});
