import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// Monta [routes] bajo `MaterialApp.router`, partiendo de
/// [initialLocation], envuelto por [wrap] (normalmente un `ProviderScope`
/// con overrides — se recibe como builder en vez de una lista tipada
/// para no tener que nombrar el tipo `Override` de Riverpod, que la
/// librería no exporta públicamente en la v3).
Future<void> pumpRoutes(
  WidgetTester tester, {
  required List<RouteBase> routes,
  required String initialLocation,
  required Widget Function(Widget child) wrap,
}) async {
  await tester.pumpWidget(
    wrap(MaterialApp.router(routerConfig: GoRouter(routes: routes, initialLocation: initialLocation))),
  );
  await tester.pumpAndSettle();
}
