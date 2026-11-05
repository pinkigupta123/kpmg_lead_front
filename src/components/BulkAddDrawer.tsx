import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, IconButton, Button, Divider, useTheme } from 'react-native-paper';
import api from '../services/api';
import { BulkAddResult } from '../types';
import SelectField from './SelectField';
import { useLeadOptions } from '../hooks/useLeadOptions';

interface Row { name: string; mobile: string; email: string; source: string }
const emptyRow = (): Row => ({ name: '', mobile: '', email: '', source: '' });
const MAX_ROWS = 100;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** called after at least one lead was saved so the list can refresh */
  onSaved: () => void;
}

/** Bottom drawer for adding many old/walk-in leads quickly: name, mobile (required), email. */
export default function BulkAddDrawer({ visible, onClose, onSaved }: Props) {
  const theme = useTheme();
  const { options } = useLeadOptions();
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BulkAddResult | null>(null);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeRow = (i: number) => setRows((r) => (r.length === 1 ? [emptyRow()] : r.filter((_, idx) => idx !== i)));
  const addRow = () => setRows((r) => (r.length >= MAX_ROWS ? r : [...r, emptyRow()]));

  const reset = () => { setRows([emptyRow()]); setResult(null); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    // rows left completely blank are ignored
    const filled = rows.filter((r) => r.name.trim() || r.mobile.trim() || r.email.trim());
    if (filled.length === 0) {
      Alert.alert('Nothing to save', 'Enter at least one mobile number.');
      return;
    }
    const bad = filled.findIndex((r) => !/^[0-9]{10}$/.test(r.mobile.trim()));
    if (bad >= 0) {
      Alert.alert('Check mobile number', `Row ${rows.indexOf(filled[bad]) + 1}: enter a valid 10-digit mobile number.`);
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/lead/customers/bulk', {
        customers: filled.map((r) => ({ name: r.name.trim(), mobile: r.mobile.trim(), email: r.email.trim() || null, lead_source: r.source || null })),
      });
      const data: BulkAddResult = res.data;
      setResult(data);
      if (data.created > 0) onSaved();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to save leads. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Add Multiple Leads</Text>
            <IconButton icon="close" onPress={close} />
          </View>
          <Divider />

          {result ? (
            <ScrollView style={styles.body}>
              <Text style={styles.resultMain}>{result.created} lead(s) added</Text>
              {result.duplicates.length > 0 && (
                <Text style={styles.resultLine}>
                  Already registered (skipped): {result.duplicates.map((d) => d.mobile).join(', ')}
                </Text>
              )}
              {result.failed.map((f) => (
                <Text key={f.row} style={[styles.resultLine, { color: theme.colors.error }]}>
                  Row {f.row}: {f.error}
                </Text>
              ))}
              <Button mode="contained" onPress={close} style={styles.footerBtn}>Done</Button>
            </ScrollView>
          ) : (
            <>
              <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                {rows.map((row, i) => (
                  <View key={i} style={styles.rowCard}>
                    <View style={styles.rowHead}>
                      <Text style={styles.rowNo}>#{i + 1}</Text>
                      <IconButton icon="delete-outline" size={20} onPress={() => removeRow(i)} />
                    </View>
                    <TextInput
                      label="Customer Name"
                      value={row.name}
                      onChangeText={(t) => update(i, { name: t })}
                      mode="outlined"
                      dense
                    />
                    <TextInput
                      label="Mobile Number *"
                      value={row.mobile}
                      onChangeText={(t) => update(i, { mobile: t.replace(/[^0-9]/g, '').slice(0, 10) })}
                      keyboardType="phone-pad"
                      mode="outlined"
                      dense
                      style={styles.gap}
                    />
                    <TextInput
                      label="Email"
                      value={row.email}
                      onChangeText={(t) => update(i, { email: t })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      mode="outlined"
                      dense
                      style={styles.gap}
                    />
                    <View style={styles.gap}>
                      <SelectField
                        label="Lead Came From"
                        icon="source-branch"
                        items={options.lead_source.map((o) => ({ value: o.label, label: o.label }))}
                        value={row.source}
                        onChange={(v) => update(i, { source: v })}
                      />
                    </View>
                  </View>
                ))}

                <Button icon="plus" mode="outlined" onPress={addRow} disabled={rows.length >= MAX_ROWS}>
                  Add another customer
                </Button>
              </ScrollView>
              <View style={styles.footer}>
                <Button mode="contained" onPress={submit} loading={saving} disabled={saving}>
                  Save Leads
                </Button>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { padding: 16 },
  rowCard: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 12, padding: 10, marginBottom: 12 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowNo: { fontWeight: '700', opacity: 0.6 },
  gap: { marginTop: 8 },
  footer: { padding: 16, paddingTop: 8 },
  footerBtn: { marginTop: 10 },
  resultMain: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  resultLine: { fontSize: 13, marginTop: 6 },
});
