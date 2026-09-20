import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// UC-08: Supabase Auth como IdP delegado (ADR-05). El cliente móvil
/// nunca custodia contraseñas ni tokens propios: solo escucha los
/// cambios de sesión y reenvía el JWT vigente en cada llamada a
/// `apps/api` (ver `api/api_client_provider.dart`).
final authStateChangesProvider = StreamProvider<AuthState>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange;
});

/// Sesión actual, reactiva a `authStateChangesProvider` y con el valor
/// sincrónico ya disponible en el primer frame (evita un parpadeo hacia
/// la pantalla de login mientras se resuelve el stream).
final currentSessionProvider = Provider<Session?>((ref) {
  final authState = ref.watch(authStateChangesProvider).value;
  return authState?.session ?? Supabase.instance.client.auth.currentSession;
});

class AuthController {
  const AuthController();

  Future<String?> signInWithPassword(String email, String password) async {
    try {
      await Supabase.instance.client.auth.signInWithPassword(email: email, password: password);
      return null;
    } on AuthException catch (error) {
      return error.message;
    }
  }

  Future<void> signOut() => Supabase.instance.client.auth.signOut();
}

final authControllerProvider = Provider<AuthController>((ref) => const AuthController());
