import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ssot_mobile/main.dart';

void main() {
  testWidgets('la app arranca y muestra la pantalla de configuración incompleta sin --dart-define', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: SsotApp()));

    expect(find.text('Configuración incompleta'), findsOneWidget);
  });
}
