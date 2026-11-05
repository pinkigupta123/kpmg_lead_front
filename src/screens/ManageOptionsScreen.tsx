import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, SegmentedButtons, Surface, Switch, useTheme, ActivityIndicator } from 'react-native-paper';
import api from '../services/api';
import { LeadOption, OptionType } from '../types';
import { useLeadOptions } from '../hooks/useLeadOptions';

const GROUPS: { value: OptionType; label: string }[] = [
  { value: 'lead_source', label: 'Lead Source' },
  { value: 'designation', label: 'Designation' },
];

/** Super admin: add / rename / hide / delete the values shown in app dropdowns. */
export default function ManageOptionsScreen() {
  const theme = useTheme();
  const { options, loading, reload } = useLeadOptions(true);
  const [type, setType] = useState<OptionType>('lead_source');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const fail = (e: any, fallback: string) => {
    const errs = e?.response?.data?.errors;
    Alert.alert('Error', (errs && (Object.values(errs)[0] as string[])[0]) || e?.response?.data?.message || fallback);
  };

  const add = async () => {
    if (!newLabel.trim()) return;
    setBusy(true);
    try {
      await api.post('/lead/options', { type, label: newLabel.trim() });
      setNewLabel('');
      await reload();
    } catch (e) { fail(e, 'Failed to add option.'); } finally { setBusy(false); }
  };

  const saveEdit = async (o: LeadOption) => {
    if (!editLabel.trim()) return;
    setBusy(true);
    try {
      await api.put(`/lead/options/${o.id}`, { label: editLabel.trim() });
      setEditingId(null);
      await reload();
    } catch (e) { fail(e, 'Failed to rename option.'); } finally { setBusy(false); }
  };

  const toggle = async (o: LeadOption) => {
    try {
      await api.put(`/lead/options/${o.id}`, { is_active: !o.is_active });
      await reload();
    } catch (e) { fail(e, 'Failed to update option.'); }
  };

  const remove = (o: LeadOption) => {
    Alert.alert('Delete option', `Remove "${o.label}" from the dropdown? Existing records keep their saved value.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/lead/options/${o.id}`); await reload(); } catch (e) { fail(e, 'Failed to delete option.'); }
        },
      },
    ]);
  };

  const list = options[type] || [];

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <SegmentedButtons value={type} onValueChange={(v) => { setType(v as OptionType); setEditingId(null); }} buttons={GROUPS} />

      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          <TextInput
            style={{ flex: 1 }}
            mode="outlined"
            dense
            label={`New ${GROUPS.find((g) => g.value === type)?.label}`}
            value={newLabel}
            onChangeText={setNewLabel}
            onSubmitEditing={add}
          />
          <Button mode="contained" onPress={add} disabled={busy || !newLabel.trim()} style={{ marginLeft: 8 }}>Add</Button>
        </View>
      </Surface>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : list.length === 0 ? (
        <Text style={styles.empty}>No options yet.</Text>
      ) : (
        list.map((o) => (
          <Surface key={o.id} style={styles.item} elevation={1}>
            {editingId === o.id ? (
              <View style={styles.row}>
                <TextInput style={{ flex: 1 }} mode="outlined" dense value={editLabel} onChangeText={setEditLabel} autoFocus />
                <IconButton icon="check" onPress={() => saveEdit(o)} />
                <IconButton icon="close" onPress={() => setEditingId(null)} />
              </View>
            ) : (
              <View style={styles.row}>
                <Text style={[styles.label, !o.is_active && { opacity: 0.45 }]}>
                  {o.label}{!o.is_active ? '  (hidden)' : ''}
                </Text>
                <Switch value={o.is_active} onValueChange={() => toggle(o)} />
                <IconButton icon="pencil" size={20} onPress={() => { setEditingId(o.id); setEditLabel(o.label); }} />
                <IconButton icon="delete-outline" size={20} onPress={() => remove(o)} />
              </View>
            )}
          </Surface>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 12, padding: 12, marginTop: 14, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 24, opacity: 0.6 },
});
