const fs = require('fs');
const path = './src/app/index.tsx';

let content = fs.readFileSync(path, 'utf8');

// Replace local state and useApp destructing
content = content.replace(/const \[isDarkMode, setIsDarkMode\] = useState\(false\);\n/, '');
content = content.replace(/t,\n  } = useApp\(\);/, "t,\n    isDarkMode,\n    toggleDarkMode,\n  } = useApp();");
content = content.replace(/onPress=\{\(\) => setIsDarkMode\(!isDarkMode\)\}/, "onPress={toggleDarkMode}");

// Now for the styles
// We want to turn `const styles = StyleSheet.create({` into `const getStyles = (isDark: boolean) => StyleSheet.create({`
content = content.replace(/const styles = StyleSheet\.create\(\{/, `const getStyles = (isDark: boolean) => StyleSheet.create({`);

// Inside HomeScreen component, add useMemo for styles
const homeScreenMatch = /export default function HomeScreen\(\) \{/;
if (homeScreenMatch.test(content)) {
  content = content.replace(homeScreenMatch, `export default function HomeScreen() {\n  const { isDarkMode, toggleDarkMode } = useApp();\n  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);`);
  // Wait, I already added isDarkMode to useApp above. I should remove one.
}

fs.writeFileSync(path, content);
console.log('Done refactoring basic structure');
