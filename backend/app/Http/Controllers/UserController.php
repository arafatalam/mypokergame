<?php

namespace App\Http\Controllers;

use App\Actions\Users\GetAssignableRoles;
use App\Actions\Users\SaveUser;
use App\Http\Requests\Users\StoreUserRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    public function createOptions(Request $request, GetAssignableRoles $getAssignableRoles): JsonResponse
    {
        $actor = $request->user();
        $allowedRoles = $getAssignableRoles->get($actor);
        $roleOptions = [];

        // Give React both the stored value and its visible label.
        foreach ($allowedRoles as $role) {
            $roleOptions[] = [
                'value' => $role->value,
                'label' => $role->label(),
            ];
        }

        $responseData = [
            'roles' => $roleOptions,
        ];

        return response()->json($responseData);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request, SaveUser $saveUser): JsonResponse
    {
        // Only validated account details reach the saving action.
        $validated = $request->validated();
        $result = $saveUser->save($validated);
        $user = $result['user'];

        // Send the generated credential in this creation response.
        $responseData = [
            'message' => 'Account created successfully.',
            'username' => $user->username,
            'generated_password' => $result['generated_password'],
        ];

        return response()->json($responseData, 201, [
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
