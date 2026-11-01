import { Stack } from 'expo-router'
import TabStack from '@/components/TabStack'

export default function ChartsLayout() {
  return (
    <TabStack title="Charts">
      <Stack.Screen name="[id]" options={{ title: '', headerBackTitle: 'Charts' }} />
      <Stack.Screen name="edit" options={{ presentation: 'modal', title: 'New chart' }} />
    </TabStack>
  )
}
