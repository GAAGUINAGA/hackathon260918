import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/env.dart';
import 'router/app_router.dart';
import 'theme/ssot_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Env.isConfigured) {
    await Supabase.initialize(url: Env.supabaseUrl, publishableKey: Env.supabaseAnonKey);
  }

  runApp(const ProviderScope(child: SsotApp()));
}

class SsotApp extends ConsumerWidget {
  const SsotApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!Env.isConfigured) {
      return const MaterialApp(home: _ConfigMissingScreen());
    }

    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'SSOT Contactos',
      theme: SsotTheme.light,
      darkTheme: SsotTheme.dark,
      routerConfig: router,
    );
  }
}

/// Pantalla mostrada cuando faltan SUPABASE_URL/SUPABASE_ANON_KEY
/// (`--dart-define`, ver README de `apps/mobile`). Sin ellas la app no
/// puede autenticar: mejor un mensaje claro que un crash al arrancar.
class _ConfigMissingScreen extends StatelessWidget {
  const _ConfigMissingScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Configuración incompleta', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              SizedBox(height: 12),
              Text(
                'Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY. Ejecuta con '
                '--dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=... '
                '(ver apps/mobile/README.md).',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
