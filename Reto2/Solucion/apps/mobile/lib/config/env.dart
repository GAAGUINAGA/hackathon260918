/// Configuración de entorno del cliente móvil (ADR-05, ADR-08). Flutter no
/// tiene `.env` nativo: los valores se pasan por `--dart-define` en
/// `flutter run`/`flutter build` (ver README de `apps/mobile`).
class Env {
  const Env._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
