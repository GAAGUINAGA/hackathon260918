import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ssot_api_client/ssot_api_client.dart';
import 'package:ssot_mobile/api/api_client_provider.dart';
import 'package:ssot_mobile/screens/contact_detail_screen.dart';

import '../test_utils.dart';

class _MockContactsApi extends Mock implements ContactsApi {}

const _contactId = '11111111-1111-1111-1111-111111111111';

final _contactFixture = ContactSummaryResponse((b) => b
  ..id = _contactId
  ..displayName = 'Ada Lovelace'
  ..company = 'Analytical Engines'
  ..primaryEmail = 'ada@example.com'
  ..primaryPhone = '+34600000000');

void main() {
  setUpAll(() => registerFallbackValue(RequestOptions(path: '/v1/contacts/$_contactId')));

  testWidgets('UC-12: muestra el detalle del contacto', (tester) async {
    final api = _MockContactsApi();
    when(() => api.contactsControllerFindById(id: _contactId)).thenAnswer(
      (_) async => Response(
        requestOptions: RequestOptions(path: '/v1/contacts/$_contactId'),
        data: _contactFixture,
        statusCode: 200,
      ),
    );

    await pumpRoutes(
      tester,
      routes: [
        GoRoute(
          path: '/contacts/:id',
          builder: (context, state) => ContactDetailScreen(contactId: state.pathParameters['id']!),
        ),
      ],
      initialLocation: '/contacts/$_contactId',
      wrap: (child) => ProviderScope(overrides: [contactsApiProvider.overrideWithValue(api)], child: child),
    );

    expect(find.text('Ada Lovelace'), findsOneWidget);
    expect(find.text('Analytical Engines'), findsOneWidget);
  });

  testWidgets('RT-15/UC-12: un 404 se muestra como "no encontrado", no como error genérico', (tester) async {
    final api = _MockContactsApi();
    when(() => api.contactsControllerFindById(id: _contactId)).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/v1/contacts/$_contactId'),
        response: Response(requestOptions: RequestOptions(path: '/v1/contacts/$_contactId'), statusCode: 404),
        type: DioExceptionType.badResponse,
      ),
    );

    await pumpRoutes(
      tester,
      routes: [
        GoRoute(
          path: '/contacts/:id',
          builder: (context, state) => ContactDetailScreen(contactId: state.pathParameters['id']!),
        ),
      ],
      initialLocation: '/contacts/$_contactId',
      wrap: (child) => ProviderScope(overrides: [contactsApiProvider.overrideWithValue(api)], child: child),
    );

    expect(find.textContaining('retirado a la papelera'), findsOneWidget);
  });
}
