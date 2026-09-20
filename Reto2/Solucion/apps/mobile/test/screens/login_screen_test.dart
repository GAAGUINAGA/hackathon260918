import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:ssot_mobile/auth/auth_providers.dart';
import 'package:ssot_mobile/screens/login_screen.dart';

import '../test_utils.dart';

class _FakeAuthController extends AuthController {
  const _FakeAuthController(this._result);
  final String? _result;

  @override
  Future<String?> signInWithPassword(String email, String password) async => _result;
}

void main() {
  testWidgets('UC-08: muestra el error de credenciales inválidas', (tester) async {
    await pumpRoutes(
      tester,
      routes: [GoRoute(path: '/login', builder: (context, state) => const LoginScreen())],
      initialLocation: '/login',
      wrap: (child) => ProviderScope(overrides: [authControllerProvider.overrideWithValue(const _FakeAuthController('Invalid login credentials'))], child: child),
    );

    await tester.enterText(find.widgetWithText(TextFormField, 'Correo electrónico'), 'user@example.com');
    await tester.enterText(find.widgetWithText(TextFormField, 'Contraseña'), 'wrong-password');
    await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
    await tester.pumpAndSettle();

    expect(find.text('Invalid login credentials'), findsOneWidget);
  });

  testWidgets('cumple las guías de accesibilidad de objetivos táctiles etiquetados', (tester) async {
    final handle = tester.ensureSemantics();

    await pumpRoutes(
      tester,
      routes: [GoRoute(path: '/login', builder: (context, state) => const LoginScreen())],
      initialLocation: '/login',
      wrap: (child) => ProviderScope(overrides: [authControllerProvider.overrideWithValue(const _FakeAuthController(null))], child: child),
    );

    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));

    handle.dispose();
  });
}
