import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { TextInput, Text, List, Divider, Checkbox, Button, useTheme } from 'react-native-paper';

interface Item { value: string; label: string }

interface Props {
  label: string;
  items: Item[];
  icon?: string;
  /** single select */
  value?: string;
  onChange?: (v: string) => void;
  /** multi select (checkbox list) */
  multiple?: boolean;
  values?: string[];
  onChangeMultiple?: (v: string[]) => void;
  emptyText?: string;
}

/** Dropdown that opens a bottom sheet. Supports single and multi selection. */
export default function SelectField({
  label, items, icon, value, onChange, multiple, values = [], onChangeMultiple, emptyText = 'No options available',
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const display = multiple
    ? items.filter((i) => values.includes(i.value)).map((i) => i.label).join(', ')
    : (items.find((i) => i.value === value)?.label ?? value ?? '');

  const toggle = (v: string) => {
    onChangeMultiple?.(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  };

  return (
    <View>
      <Pressable onPress={() => setOpen(true)}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={display}
            mode="outlined"
            editable={false}
            left={icon ? <TextInput.Icon icon={icon} /> : undefined}
            right={<TextInput.Icon icon="menu-down" />}
          />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{label}</Text>
          <Divider />
          <ScrollView style={{ maxHeight: 340 }}>
            {items.length === 0 && <Text style={styles.empty}>{emptyText}</Text>}
            {items.map((it) =>
              multiple ? (
                <List.Item
                  key={it.value}
                  title={it.label}
                  onPress={() => toggle(it.value)}
                  left={() => (
                    <Checkbox status={values.includes(it.value) ? 'checked' : 'unchecked'} onPress={() => toggle(it.value)} />
                  )}
                />
              ) : (
                <List.Item
                  key={it.value}
                  title={it.label}
                  onPress={() => { onChange?.(it.value); setOpen(false); }}
                  right={() => (value === it.value ? <List.Icon icon="check" /> : null)}
                />
              )
            )}
          </ScrollView>
          {multiple ? (
            <Button mode="contained" onPress={() => setOpen(false)} style={styles.done}>Done</Button>
          ) : value ? (
            <Button onPress={() => { onChange?.(''); setOpen(false); }} style={styles.done}>Clear</Button>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 20 },
  title: { fontSize: 16, fontWeight: '700', padding: 16 },
  empty: { padding: 16, opacity: 0.6 },
  done: { marginHorizontal: 16, marginTop: 8 },
});
