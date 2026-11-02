import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';

/**
 * Loads the four Inter weights the app uses. Importing each weight separately keeps
 * the app small (the full Inter package contains 18 font files).
 *
 * Returns true once the fonts are ready, or if they failed to load: the app then
 * continues with the phone's system font rather than getting stuck.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  return loaded || error !== null;
}
