import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ssot_api_client/ssot_api_client.dart';
import 'package:ssot_mobile/api/api_client_provider.dart';
import 'package:ssot_mobile/screens/new_contact_screen.dart';

import '../test_utils.dart';

class _MockContactsApi extends Mock implements ContactsApi {}

class _FakeCreateRequest extends Fake implements ContactsControllerCreateRequest {}

void main() {
  setUpAll(() {
    registerFallbackValue(RequestOptions(path: '/v1/contacts'));
    registerFallbackValue(_FakeCreateRequest());
  });

  testWidgets('UC-01: crea el contacto y navega a su detalle', (tester) async {
    final api = _MockContactsApi();
    when(() => api.contactsControllerCreate(contactsControllerCreateRequest: any(named: 'contactsControllerCreateRequest')))
        .thenAnswer(
      (_) async => Response(
        requestOptions: RequestOptions(path: '/v1/contacts'),
        data: CreateContactResponse((b) => b
          ..contactId = '22222222-2222-2222-2222-222222222222'
          ..version = 1),
        statusCode: 201,
      ),
    );

    await pumpRoutes(
      tester,
      routes: [
        GoRoute(path: '/contacts/new', builder: (context, state) => const NewContactScreen()),
        GoRoute(path: '/contacts/:id', builder: (context, state) => Text('detalle:${state.pathParameters['id']}')),
      ],
      initialLocation: '/contacts/new',
      wrap: (child) => ProviderScope(overrides: [contactsApiProvider.overrideWithValue(api)], child: child),
    );

    await tester.enterText(find.widgetWithText(TextField, 'Nombre'), 'Grace Hopper');
    await tester.tap(find.widgetWithText(FilledButton, 'Crear contacto'));
    await tester.pumpAndSettle();

    expect(find.text('detalle:22222222-2222-2222-2222-222222222222'), findsOneWidget);
  });

  testWidgets('muestra el error del backend asociado al campo (RT-02)', (tester) async {
    final api = _MockContactsApi();
    when(() => api.contactsControllerCreate(contactsControllerCreateRequest: any(named: 'contactsControllerCreateRequest')))
        .thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/v1/contacts'),
        response: Response(
          requestOptions: RequestOptions(path: '/v1/contacts'),
          statusCode: 400,
          data: {'code': 'invalid_input', 'message': 'El nombre no puede estar vacío.', 'field': 'displayName'},
        ),
        type: DioExceptionType.badResponse,
      ),
    );

    await pumpRoutes(
      tester,
      routes: [GoRoute(path: '/contacts/new', builder: (context, state) => const NewContactScreen())],
      initialLocation: '/contacts/new',
      wrap: (child) => ProviderScope(overrides: [contactsApiProvider.overrideWithValue(api)], child: child),
    );

    await tester.enterText(find.widgetWithText(TextField, 'Nombre'), '__invalid__');
    await tester.tap(find.widgetWithText(FilledButton, 'Crear contacto'));
    await tester.pumpAndSettle();

    expect(find.text('El nombre no puede estar vacío.'), findsOneWidget);
  });

  testWidgets('cumple las guías de accesibilidad de objetivos táctiles etiquetados', (tester) async {
    final handle = tester.ensureSemantics();

    await pumpRoutes(
      tester,
      routes: [GoRoute(path: '/contacts/new', builder: (context, state) => const NewContactScreen())],
      initialLocation: '/contacts/new',
      wrap: (child) => ProviderScope(overrides: [contactsApiProvider.overrideWithValue(_MockContactsApi())], child: child),
    );

    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));

    handle.dispose();
  });
}
