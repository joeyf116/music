import { Stack } from 'expo-router'
import TabStack, { SHEET } from '@/components/TabStack'

export default function ResourcesLayout() {
  return (
    <TabStack title="Resources">
      <Stack.Screen name="add" options={{ ...SHEET, sheetAllowedDetents: [1], title: 'Add a resource' }} />
    </TabStack>
  )
}
